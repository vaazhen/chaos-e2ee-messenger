import { useState, useCallback } from "react";
import { api, call, getToken, API_BASE } from "../api";
import { getOrCreateDeviceId } from "../deviceId";
import { getTime } from "../helpers";
import { saveMessagePreview } from "../previewCache";
import * as localStore from "../localMessageStore";
import { compressImageToDataUrl, IMAGE_PROFILES } from "../imagePipeline";

const MAX_ENCRYPTED_PAYLOAD_CHARS = 180_000;

/**
 * Manages per-chat message maps, loading, sending (E2EE), editing, deleting.
 */
export function useMessages(myId) {
  const [msgs, setMsgs]               = useState({});
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // ── Load & decrypt messages for a chat ──────────────────────────────────────
  // Architecture: IndexedDB is primary store (like Signal).
  // On page reload → read from DB (zero crypto, zero API).
  // Cold sync (first time) → API → decrypt → persist → render.
  const loadMessages = useCallback(async (chatId) => {
    if (!chatId) return;
    const syncFromApi = async (chatId, cached) => {
      try {
        const data = await api.getMessages(chatId);
        if (!Array.isArray(data)) return;
        const existingIds = new Map(
          cached
            .filter(m => !isEncryptedPlaceholder(m))
            .map(m => [String(m.id || m.messageId), true])
        );
        const hidden = loadHiddenMessageIds(myId);
        const newOnes = data.filter(msg => !existingIds.has(String(msg.id || msg.messageId)))
          .filter(msg => !hidden.has(String(msg.id || msg.messageId)))
          .filter(msg => !(msg.deleted === true || msg.deletedAt));
        if (newOnes.length === 0) return;
        const decrypted = [];
        for (const msg of newOnes) {
          decrypted.push(await decryptMsg(msg, myId, chatId));
        }
        await persistDecryptedMessages(decrypted);
        setMsgs(prev => {
          const existing = prev[chatId] || [];
          const merged = [...existing];
          for (const d of decrypted) {
            const idx = merged.findIndex(m => String(m.id || m.messageId) === String(d.id || d.messageId));
            if (idx === -1) merged.push(d);
            else merged[idx] = mergeIncomingMessage(merged[idx], d);
          }
          return { ...prev, [chatId]: merged };
        });
      } catch (e) {
        console.error("syncFromApi:", e);
      }
    };
    const rehydrateCachedAttachments = async (chatId, messages) => {
      const needsRehydrate = messages.filter(needsAttachmentHydration);
      if (needsRehydrate.length === 0) return;
      for (const msg of needsRehydrate) {
        try {
          const hydrated = await hydrateAttachment(msg._attachment, msg._payload?.type);
          msg._img = hydrated.img || msg._img;
          msg._voice = hydrated.voice || msg._voice;
          msg._videoNote = hydrated.videoNote || msg._videoNote;
          msg._attachment = hydrated.attachment;
          await localStore.saveMessage(msg);
        } catch (e) {
          console.warn('[rehydrate] failed for msg', msg.id, e);
        }
      }
      setMsgs(prev => {
        const existing = prev[chatId] || [];
        const updated = existing.map(m => {
          const r = needsRehydrate.find(h => h.id === m.id);
          return r || m;
        });
        return { ...prev, [chatId]: updated };
      });
    };

    setLoadingMsgs(true);
    try {
      let fromApi = false;
      const cached = await localStore.getMessagesByChat(chatId);
      if (cached && cached.length > 0) {
        setMsgs(prev => ({ ...prev, [chatId]: cached }));
        rehydrateCachedAttachments(chatId, cached);
        syncFromApi(chatId, cached);
      } else {
        fromApi = true;
        const data = await api.getMessages(chatId);
        if (!Array.isArray(data)) return;
        const hidden = loadHiddenMessageIds(myId);
        const filtered = data
          .filter(msg => !hidden.has(String(msg.id || msg.messageId)))
          .filter(msg => !(msg.deleted === true || msg.deletedAt));
        const decrypted = [];
        for (const msg of filtered) {
          decrypted.push(await decryptMsg(msg, myId, chatId));
        }
        await persistDecryptedMessages(decrypted);
        setMsgs(prev => ({ ...prev, [chatId]: decrypted }));
      }
      if (fromApi) {
        try { await api.markDelivered(chatId); } catch (_) { /* ignore optional failure */ }
      }
    } catch (e) {
      console.error("loadMessages:", e);
    } finally {
      setLoadingMsgs(false);
    }
  }, [myId]);

  // ── Handle incoming WS event ─────────────────────────────────────────────────
  const handleIncomingEvent = useCallback(async (event, chatId) => {
    const eventType = event.type || event.eventType;

    if (eventType === "MESSAGE_REACTION") {
      let updatedMyReactions;
      setMsgs(prev => {
        const updated = updateMessageReactions(prev, chatId, event.messageId, event.reactions, event.actorUserId, event.emoji, event.active, myId);
        const msg = updated[chatId]?.find(m => String(m.id) === String(event.messageId));
        if (msg) updatedMyReactions = msg.myReactions;
        return updated;
      });
      if (updatedMyReactions) {
        localStore.updateMessageReactions(event.messageId, event.reactions, updatedMyReactions).catch(() => {});
      }
      return { type: eventType, isOut: Number(event.actorUserId) === Number(myId) };
    }

    const messageId = event.id || event.messageId;
    if (!eventType && !event.envelope && !event.content) {
      console.warn("[WS] ignored non-message event without payload", event);
      return null;
    }
    if (messageId && loadHiddenMessageIds(myId).has(String(messageId))) {
      return null;
    }

    if (eventType === "MESSAGE_DELETED") {
      setMsgs(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).filter(m => String(m.id) !== String(event.messageId)),
      }));
      localStore.deleteMessage(event.messageId).catch(() => {});
      return null;
    }

    let decryptedText = "[encrypted]";
    if (event.envelope && window.e2ee?.decryptEnvelope) {
      try {
        const envelope = envelopeForDecrypt(
          event.envelope,
          event.senderDeviceId,
          chatId
        );
        decryptedText = await window.e2ee.decryptEnvelope(envelope);
      } catch (e) {
        console.warn("[WS] decrypt:", e.message);
      }
    } else if (event.content && event.content !== "[encrypted]") {
      decryptedText = event.content;
    }

    const parsed = parseMessagePayload(decryptedText);
    const isOut = event.senderId === myId;
    const preview = messagePreview(parsed);

    let resolvedImg = parsed.img;
    let resolvedVoice = parsed.voice;
    let resolvedVideoNote = parsed.videoNote;
    let resolvedAttachment = parsed.attachment || null;

    if (resolvedAttachment?.attachmentId && window.e2ee?.decryptFile) {
      try {
        const hydrated = await hydrateAttachment(resolvedAttachment, parsed.payload?.type);
        resolvedImg = hydrated.img || resolvedImg;
        resolvedVoice = hydrated.voice || resolvedVoice;
        resolvedVideoNote = hydrated.videoNote || resolvedVideoNote;
        resolvedAttachment = hydrated.attachment;
      } catch (e) {
        console.warn("[WS] attachment decrypt:", e.message);
      }
    }

    let expiresAt = null;
    if (parsed.ttl && event.createdAt) {
      expiresAt = new Date(new Date(event.createdAt).getTime() + parsed.ttl * 1000).toISOString();
    }

    saveMessagePreview({
      userId: myId,
      chatId,
      messageId,
      preview,
      createdAt: event.createdAt,
      isOut,
    });
    const msg = {
      id:        messageId,
      chatId,
      senderId:  event.senderId,
      content:   decryptedText,
      createdAt: event.createdAt,
      editedAt:  event.editedAt,
      version:   event.version,
      status:    event.status || "SENT",
      reactions: event.reactions || {},
      myReactions: event.myReactions || [],
      _out:      isOut,
      _text:     parsed.text,
      _img:      resolvedImg,
      _voice:    resolvedVoice,
      _videoNote: resolvedVideoNote,
      _payload:  parsed.payload,
      _attachment: resolvedAttachment,
      _ttl:      parsed.ttl || null,
      _replyTo:  parsed.replyTo || null,
      expiresAt,
      _time:     getTime(event.createdAt),
    };

    setMsgs(prev => {
      const arr         = prev[chatId] || [];
      const withoutTemp = isOut ? arr.filter(m => !(m._temp && m._clientMessageId === event.clientMessageId)) : arr;
      const idx         = withoutTemp.findIndex(m => String(m.id) === String(msg.id));
      const updated     = idx >= 0
        ? withoutTemp.map((m, i) => i === idx ? mergeIncomingMessage(m, msg) : m)
        : [...withoutTemp, msg];
      return { ...prev, [chatId]: updated };
    });

    if (!isEncryptedPlaceholder(msg)) {
      localStore.saveMessage(msg).catch(() => {});
    }

    return { isOut, text: preview, type: eventType, messageId };
  }, [myId]);

  // ── Update delivery/read status ─────────────────────────────────────────────
  const updateMessageStatus = useCallback((messageId, status) => {
    setMsgs(prev => {
      const updated = {};
      for (const [cid, arr] of Object.entries(prev)) {
        updated[cid] = arr.map(m =>
          String(m.id) === String(messageId) ? { ...m, status } : m
        );
      }
      return updated;
    });
  }, [myId]);

  const updateChatOutgoingStatus = useCallback((chatId, status) => {
    if (!chatId || !status) return;
    setMsgs(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || []).map(m =>
        m._out && !m._temp ? { ...m, status } : m
      ),
    }));
  }, []);

  // ── Send (E2EE) ─────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (chatId, input) => {
    const text = typeof input === "string" ? input : String(input?.text || "").trim();
    const imgFile = typeof input === "string" ? null : input?.imgFile;
    const voiceFile = typeof input === "string" ? null : input?.voiceFile;
    const videoNoteFile = typeof input === "string" ? null : input?.videoNoteFile;
    const generalFile = typeof input === "string" ? null : input?.generalFile;
    const ttl = typeof input === "string" ? null : input?.ttl;
    const replyTo = typeof input === "string" ? null : input?.replyTo;
    if ((!text && !imgFile && !voiceFile && !videoNoteFile && !generalFile) || !chatId) return null;
    if (!window.e2ee?.buildFanoutRequest) {
      console.error("[Send] crypto-engine is not loaded");
      return null;
    }

    const clientMessageId = "tmp_" + Date.now();
    let parsedPayload = { text, img: null, voice: null, videoNote: null, payload: null, replyTo };
    let encryptedPlaintext = text;

    try {
      if (generalFile) {
        const attachment = await encryptAndUploadFile(generalFile, chatId);
        parsedPayload = {
          text,
          img: null,
          voice: null,
          payload: {
            v: 1,
            type: "file",
            text,
            attachment,
          },
        };
        encryptedPlaintext = JSON.stringify(parsedPayload.payload);
      } else if (imgFile?.file) {
        const image = await compressImageFile(imgFile.file);
        const buf = dataUrlToArrayBuffer(image.dataUrl);
        const attachment = await encryptAndUploadBuffer(buf, {
          fileName: image.name || "image.jpg",
          mimeType: image.mime || "image/jpeg",
          width: image.width,
          height: image.height,
        }, chatId);
        parsedPayload = { text, img: image.dataUrl, payload: { v: 1, type: "image", text, attachment } };
        encryptedPlaintext = JSON.stringify(parsedPayload.payload);
      } else if (voiceFile) {
        if (window.e2ee?.encryptFile) {
          const blob = voiceFile.blob || voiceFile.file;
          const buf = blob
            ? await readBlobAsArrayBuffer(blob)
            : dataUrlToArrayBuffer(voiceFile.dataUrl);
          const attachment = await encryptAndUploadBuffer(buf, {
            fileName: voiceFile.name || "voice-message.webm",
            mimeType: voiceFile.mime || blob?.type || "audio/webm",
            durationMs: voiceFile.durationMs,
            transcript: voiceFile.transcript || text || "",
          }, chatId);
          const previewUrl = voiceFile.previewUrl
            || (blob ? URL.createObjectURL(blob) : voiceFile.dataUrl);
          parsedPayload = {
            text: voiceFile.transcript || text,
            img: null,
            voice: {
              dataUrl: previewUrl,
              durationMs: voiceFile.durationMs || 0,
              mime: attachment.mimeType,
              transcript: voiceFile.transcript || text || "",
            },
            payload: { v: 1, type: "voice", text: voiceFile.transcript || text, attachment },
          };
          encryptedPlaintext = JSON.stringify(parsedPayload.payload);
        } else {
          const voice = await prepareVoiceFile(voiceFile);
          const payload = { v: 1, type: "voice", text: voice.transcript || text, voice };
          const encoded = JSON.stringify(payload);
          if (encoded.length > MAX_ENCRYPTED_PAYLOAD_CHARS) {
            throw new Error("Нет клиентского шифрования файла");
          }
          parsedPayload = { text: voice.transcript || text, img: null, voice, payload };
          encryptedPlaintext = encoded;
        }
      } else if (videoNoteFile) {
        const blob = videoNoteFile.blob || videoNoteFile.file;
        if (!blob) throw new Error("Видео не записалось");
        const mime = playbackMime(videoNoteFile.mime || blob.type, "video/webm");
        const previewUrl = videoNoteFile.previewUrl || URL.createObjectURL(blob);
        const localNote = {
          src: previewUrl,
          durationMs: videoNoteFile.durationMs || 0,
          mime,
        };
        const attachment = await encryptAndUploadBuffer(await readBlobAsArrayBuffer(blob), {
          fileName: videoNoteFile.name || "video-note.webm",
          mimeType: mime,
          durationMs: localNote.durationMs,
        }, chatId);
        parsedPayload = {
          text,
          img: null,
          voice: null,
          videoNote: localNote,
          payload: { v: 1, type: "video_note", text, attachment },
        };
        encryptedPlaintext = JSON.stringify(parsedPayload.payload);
      }
    } catch (e) {
      console.error("[Send] media prepare error:", e);
      throw (e instanceof Error ? e : new Error("Не удалось подготовить файл"));
    }

    if (ttl || replyTo) {
      try {
        const payloadObj = encryptedPlaintext.startsWith("{") ? JSON.parse(encryptedPlaintext) : { v: 1, type: "text", text: encryptedPlaintext };
        if (ttl) payloadObj.ttl = ttl;
        if (replyTo) payloadObj.replyTo = compactReplyTo(replyTo);
        encryptedPlaintext = JSON.stringify(payloadObj);
      } catch (_) {
        const base = { v: 1, type: "text", text: encryptedPlaintext };
        if (ttl) base.ttl = ttl;
        if (replyTo) base.replyTo = compactReplyTo(replyTo);
        encryptedPlaintext = JSON.stringify(base);
      }
    }

    if (encryptedPlaintext.length > MAX_ENCRYPTED_PAYLOAD_CHARS) {
      throw new Error("Файл слишком большой для отправки сообщением. Нужно вложение, а не inline.");
    }

    const tempExpiresAt = ttl ? new Date(Date.now() + ttl * 1000).toISOString() : null;
    const tempMsg = {
      id: clientMessageId,
      _clientMessageId: clientMessageId,
      _temp: true,
      _out: true,
      _text: parsedPayload.text,
      _img: parsedPayload.img,
      _voice: parsedPayload.voice,
      _videoNote: parsedPayload.videoNote,
      _payload: parsedPayload.payload,
      _attachment: parsedPayload.payload?.attachment || null,
      _ttl: ttl || null,
      _replyTo: compactReplyTo(replyTo),
      expiresAt: tempExpiresAt,
      _time: getTime(),
      content: encryptedPlaintext,
      senderId: myId,
      status: "SENT",
      reactions: {},
      myReactions: [],
    };
    setMsgs(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), tempMsg] }));

    try {
      const fanout = await window.e2ee.buildFanoutRequest(makeCryptoApi(), chatId, encryptedPlaintext);
      const response = await call("/messages/encrypted/v2", {
        method: "POST",
        body: JSON.stringify({ ...fanout, clientMessageId }),
      });

      if (response?.id || response?.messageId) {
        const savedId = response.id || response.messageId;
        const preview = messagePreview(parsedPayload);
        saveMessagePreview({
          userId: myId,
          chatId,
          messageId: savedId,
          preview,
          createdAt: response.createdAt,
          isOut: true,
        });
        setMsgs(prev => ({
          ...prev,
          [chatId]: (prev[chatId] || []).map(m =>
            m.id === clientMessageId
              ? { ...m, id: savedId, _temp: false, status: response.status || "SENT", reactions: response.reactions || {}, myReactions: response.myReactions || [] }
              : m
          ),
        }));
      }
      return { clientMessageId, response, preview: messagePreview(parsedPayload) };
    } catch (e) {
      console.error("[Send] error:", e);
      setMsgs(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).filter(m => m.id !== clientMessageId),
      }));
      throw (e instanceof Error ? e : new Error("Сообщение не отправилось"));
    }
  }, [myId]);

  // ── Edit (E2EE) ─────────────────────────────────────────────────────────────
  const toggleReaction = useCallback(async (chatId, msg, emoji) => {
    if (!chatId || !msg?.id || msg._temp || !emoji) return;

    const had = Array.isArray(msg.myReactions) && msg.myReactions.includes(emoji);
    const nextSummary = adjustReactionSummary(msg.reactions || {}, emoji, had ? -1 : 1);
    const nextMine = had
      ? (msg.myReactions || []).filter(e => e !== emoji)
      : [...new Set([...(msg.myReactions || []), emoji])];

    setMsgs(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || []).map(m =>
        String(m.id) === String(msg.id)
          ? { ...m, reactions: nextSummary, myReactions: nextMine }
          : m
      ),
    }));

    try {
      const event = await api.toggleReaction(msg.id, emoji);
      setMsgs(prev => updateMessageReactions(
        prev,
        chatId,
        event.messageId,
        event.reactions,
        event.actorUserId,
        event.emoji,
        event.active,
        myId
      ));
      return event;
    } catch (e) {
      console.error("[Reaction] error:", e);

      setMsgs(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map(m =>
          String(m.id) === String(msg.id)
            ? { ...m, reactions: msg.reactions || {}, myReactions: msg.myReactions || [] }
            : m
        ),
      }));

      return null;
    }
  }, [myId]);

  const editMessage = useCallback(async (chatId, msg, newText) => {
    const text = String(newText || "").trim();
    if (!chatId || !msg?.id || msg._temp || !text) return null;
    if (!window.e2ee?.buildFanoutRequest) {
      console.error("[Edit] crypto-engine is not loaded");
      return null;
    }

    const previous = { ...msg };
    const nextPayload = buildEditedPayload(msg, text);
    const plaintext = nextPayload.plaintext;
    const parsed = nextPayload.parsed;
    const editedAt = new Date().toISOString();

    setMsgs(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || []).map(m =>
        String(m.id) === String(msg.id)
          ? {
              ...m,
              content: plaintext,
              editedAt,
              version: (m.version || 1) + 1,
              _text: parsed.text,
              _img: parsed.img,
              _voice: parsed.voice,
              _payload: parsed.payload,
            }
          : m
      ),
    }));

    try {
      const fanout = await window.e2ee.buildFanoutRequest(makeCryptoApi(), chatId, plaintext);
      const response = await call(`/messages/${msg.id}/encrypted/v2`, {
        method: "PUT",
        body: JSON.stringify({
          senderDeviceId: fanout.senderDeviceId,
          envelopes: fanout.envelopes,
        }),
      });

      setMsgs(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map(m =>
          String(m.id) === String(msg.id)
            ? {
                ...m,
                editedAt: response?.editedAt || editedAt,
                version: response?.version || m.version,
                status: response?.status || m.status,
              }
            : m
        ),
      }));

      const preview = messagePreview(parsed);
      saveMessagePreview({
        userId: myId,
        chatId,
        messageId: msg.id,
        preview,
        createdAt: response?.createdAt || msg.createdAt,
        isOut: true,
      });

      return { response, preview };
    } catch (e) {
      console.error("[Edit] error:", e);
      setMsgs(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map(m =>
          String(m.id) === String(msg.id) ? previous : m
        ),
      }));
      return null;
    }
  }, [myId]);

  // ── Delete ──────────────────────────────────────────────────────────────────
  const deleteMessage = useCallback((chatId, msg, scope = "everyone") => {
    if (!msg?.id) return;

    setMsgs(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || []).filter(m => String(m.id) !== String(msg.id)),
    }));

    localStore.deleteMessage(msg.id).catch(() => {});

    if (scope === "me" || msg._temp) {
      addHiddenMessageId(myId, msg.id);
      return;
    }

    api.deleteMsg(msg.id).catch(console.error);
  }, [myId]);

  return {
    msgs, setMsgs,
    loadingMsgs,
    loadMessages,
    handleIncomingEvent,
    updateMessageStatus,
    updateChatOutgoingStatus,
    sendMessage,
    editMessage,
    toggleReaction,
    deleteMessage,
  };
}

// ── helpers ──────────────────────────────────────────────────────────────────

function envelopeForDecrypt(envelope, senderDeviceId, chatId) {
  if (!envelope) return envelope;
  return {
    ...envelope,
    senderDeviceId: senderDeviceId || envelope.senderDeviceId,
    _chatId: chatId ?? envelope._chatId,
  };
}

async function persistDecryptedMessages(messages) {
  const persistable = (messages || []).filter(m => m && !isEncryptedPlaceholder(m));
  if (persistable.length === 0) return;
  await localStore.saveMessages(persistable);
}

async function decryptMsg(msg, myId, fallbackChatId) {
  let decryptedText = msg.content || "[encrypted]";

  if (decryptedText === "[encrypted]" && msg.envelope && window.e2ee?.decryptEnvelope) {
    try {
      const envelope = envelopeForDecrypt(
        msg.envelope,
        msg.senderDeviceId,
        msg.chatId || fallbackChatId
      );
      decryptedText = await window.e2ee.decryptEnvelope(envelope);
    } catch (e) {
      console.warn("[Timeline] decrypt:", e.message);
    }
  }
  const parsed = parseMessagePayload(decryptedText);

  let resolvedImg = parsed.img;
  let resolvedVoice = parsed.voice;
  let resolvedVideoNote = parsed.videoNote;
  let resolvedAttachment = parsed.attachment || null;

  if (resolvedAttachment?.attachmentId && window.e2ee?.decryptFile) {
    try {
      const hydrated = await hydrateAttachment(resolvedAttachment, parsed.payload?.type);
      resolvedImg = hydrated.img || resolvedImg;
      resolvedVoice = hydrated.voice || resolvedVoice;
      resolvedVideoNote = hydrated.videoNote || resolvedVideoNote;
      resolvedAttachment = hydrated.attachment;
    } catch (e) {
      console.warn("[Timeline] attachment decrypt:", e.message);
    }
  }

  let expiresAt = null;
  if (parsed.ttl && msg.createdAt) {
    expiresAt = new Date(new Date(msg.createdAt).getTime() + parsed.ttl * 1000).toISOString();
  }

  saveMessagePreview({
    userId: myId,
    chatId: msg.chatId || fallbackChatId,
    messageId: msg.id || msg.messageId,
    preview: messagePreview(parsed),
    createdAt: msg.createdAt,
    isOut: msg.senderId === myId,
  });
  return {
    ...msg,
    content: decryptedText,
    _text: parsed.text,
    _img: resolvedImg,
    _voice: resolvedVoice,
    _videoNote: resolvedVideoNote,
    _payload: parsed.payload,
    _attachment: resolvedAttachment,
    _ttl: parsed.ttl || null,
    expiresAt,
    _out:  msg.senderId === myId,
    _time: getTime(msg.createdAt),
  };
}

function mergeIncomingMessage(existing, incoming) {
  if (!existing) return incoming;

  const incomingEncrypted = isEncryptedPlaceholder(incoming);
  const existingPlain = hasRenderablePlaintext(existing);
  if (incomingEncrypted && existingPlain) {
    return {
      ...incoming,
      content: existing.content,
      _text: existing._text,
      _img: existing._img,
      _voice: existing._voice,
      _videoNote: existing._videoNote,
      _payload: existing._payload,
      _attachment: existing._attachment,
      _ttl: existing._ttl,
      expiresAt: existing.expiresAt,
      _time: existing._time,
    };
  }

  return { ...existing, ...incoming };
}

function isEncryptedPlaceholder(msg) {
  return !msg || msg.content === "[encrypted]" || msg._text === "[encrypted]";
}

function hasRenderablePlaintext(msg) {
  if (!msg) return false;
  if (msg._img || msg._voice || msg._videoNote || msg._attachment) return true;
  return Boolean(msg._text && msg._text !== "[encrypted]");
}

function updateMessageReactions(prev, chatId, messageId, reactions, actorUserId, emoji, active, myId) {
  return {
    ...prev,
    [chatId]: (prev[chatId] || []).map(m => {
      if (String(m.id) !== String(messageId)) return m;

      let myReactions = Array.isArray(m.myReactions) ? [...m.myReactions] : [];

      if (Number(actorUserId) === Number(myId) && emoji) {
        myReactions = active
          ? [...new Set([...myReactions, emoji])]
          : myReactions.filter(e => e !== emoji);
      }

      return {
        ...m,
        reactions: reactions || {},
        myReactions,
      };
    }),
  };
}

function adjustReactionSummary(summary, emoji, delta) {
  const next = { ...(summary || {}) };
  const value = Math.max(0, Number(next[emoji] || 0) + delta);

  if (value <= 0) delete next[emoji];
  else next[emoji] = value;

  return next;
}

function parseMessagePayload(raw) {
  const fallbackText = String(raw || "");
  if (!fallbackText || fallbackText === "[encrypted]") {
    return { text: fallbackText, img: null, voice: null, videoNote: null, payload: null, attachment: null, replyTo: null };
  }
  try {
    const payload = JSON.parse(fallbackText);
    if (payload?.v === 1 && payload?.type === "image") {
      const image = payload.image || {};
      const attachment = payload.attachment || null;
      return {
        text: String(payload.text || ""),
        img: image.dataUrl || payload.dataUrl || null,
        voice: null,
        videoNote: null,
        payload,
        attachment,
        ttl: payload.ttl || null,
        replyTo: payload.replyTo || null,
      };
    }
    if (payload?.v === 1 && payload?.type === "voice") {
      const voice = payload.voice || {};
      const attachment = payload.attachment || null;
      const transcript = String(payload.text || voice.transcript || attachment?.transcript || "");
      return {
        text: transcript,
        img: null,
        voice: voice.dataUrl ? { ...voice, transcript } : null,
        videoNote: null,
        payload,
        attachment,
        ttl: payload.ttl || null,
        replyTo: payload.replyTo || null,
      };
    }
    if (payload?.v === 1 && payload?.type === "video_note") {
      const attachment = payload.attachment || null;
      const note = payload.videoNote || {};
      const src = isInlineDataSrc(note.src) ? note.src : null;
      return {
        text: String(payload.text || ""),
        img: null,
        voice: null,
        videoNote: src
          ? {
              src,
              durationMs: note.durationMs || attachment?.durationMs || 0,
              mime: playbackMime(note.mime, attachment?.mimeType || "video/webm"),
            }
          : null,
        payload,
        attachment,
        ttl: payload.ttl || null,
        replyTo: payload.replyTo || null,
      };
    }
    if (payload?.v === 1 && payload?.type === "file") {
      const attachment = payload.attachment || {};
      return {
        text: String(payload.text || ""),
        img: null,
        voice: null,
        videoNote: null,
        payload,
        attachment,
        ttl: payload.ttl || null,
        replyTo: payload.replyTo || null,
      };
    }
    if (payload?.v === 1) {
      return {
        text: String(payload.text || fallbackText),
        img: null,
        voice: null,
        videoNote: null,
        payload,
        attachment: null,
        ttl: payload.ttl || null,
        replyTo: payload.replyTo || null,
      };
    }
  } catch (_) {
    // regular text message
  }
  return { text: fallbackText, img: null, voice: null, videoNote: null, payload: null, attachment: null, replyTo: null };
}

function messagePreview(parsed) {
  if (parsed?.payload?.type === "video_note") return parsed.text ? `🎥 ${parsed.text}` : "Video message";
  if (parsed?.attachment?.attachmentId && parsed?.payload?.type === "file") {
    const name = parsed.attachment.fileName || "File";
    return parsed.text ? `📎 ${parsed.text}` : `📎 ${name}`;
  }
  if (parsed?.img) return parsed.text ? `📷 ${parsed.text}` : "📷 Photo";
  if (parsed?.payload?.type === "voice" || parsed?.voice) {
    const caption = parsed.voice?.transcript || parsed.text;
    return caption ? `Voice: ${caption}` : "Voice message";
  }
  return parsed?.text || "";
}

function buildEditedPayload(msg, text) {
  const replyTo = msg?._replyTo || msg?._payload?.replyTo || null;
  if (msg?._payload?.v === 1 && msg?._payload?.type === "image") {
    const payload = { ...msg._payload, text };
    if (replyTo) payload.replyTo = replyTo;
    const image = payload.image || {};
    return {
      plaintext: JSON.stringify(payload),
      parsed: {
        text,
        img: image.dataUrl || payload.dataUrl || msg._img || null,
        voice: null,
        payload,
        replyTo,
      },
    };
  }

  if (msg?._payload?.v === 1 && msg?._payload?.type === "voice") {
    const payload = { ...msg._payload, text };
    if (replyTo) payload.replyTo = replyTo;
    const voice = payload.voice || {};
    return {
      plaintext: JSON.stringify(payload),
      parsed: {
        text,
        img: null,
        voice: voice.dataUrl ? voice : msg._voice || null,
        payload,
        replyTo,
      },
    };
  }

  const hasReply = !!(replyTo);
  if (hasReply) {
    const payload = { v: 1, type: "text", text, replyTo };
    return {
      plaintext: JSON.stringify(payload),
      parsed: { text, img: null, voice: null, payload, replyTo },
    };
  }

  return {
    plaintext: text,
    parsed: { text, img: null, voice: null, payload: null, replyTo: null },
  };
}

function makeCryptoApi() {
  const token    = getToken();
  const deviceId = getOrCreateDeviceId();
  const baseUrl  = API_BASE.replace(/\/api$/, "");

  return async (path, opts = {}) => {
    const r = await fetch(baseUrl + path, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
        "X-Device-Id": deviceId,
        ...opts.headers,
      },
    });

    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body?.message || `${r.status}`);
    }

    return r.json().catch(() => null);
  };
}

function hiddenKey(myId) {
  return `cm_hidden_message_ids:${myId || "anonymous"}`;
}

function loadHiddenMessageIds(myId) {
  try {
    const raw = localStorage.getItem(hiddenKey(myId));
    const parsed = JSON.parse(raw || "[]");
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function addHiddenMessageId(myId, messageId) {
  const ids = loadHiddenMessageIds(myId);
  ids.add(String(messageId));
  try {
    localStorage.setItem(hiddenKey(myId), JSON.stringify([...ids].slice(-2000)));
  } catch (_) { /* ignore optional failure */ }
}

async function compressImageFile(file) {
  const compressed = await compressImageToDataUrl(file, IMAGE_PROFILES.chatImage);

  return {
    dataUrl: compressed.dataUrl,
    mime: compressed.mime,
    name: file.name || "image",
    originalMime: file.type || null,
    originalSize: file.size || 0,
    size: compressed.bytes,
    width: compressed.width,
    height: compressed.height,
  };
}

async function prepareVoiceFile(input) {
  const dataUrl = input.dataUrl || await blobToDataUrl(input.blob || input.file);
  return {
    dataUrl,
    mime: input.mime || input.blob?.type || input.file?.type || "audio/webm",
    name: input.name || "voice-message.webm",
    size: input.size || input.blob?.size || input.file?.size || Math.round((String(dataUrl).length * 3) / 4),
    durationMs: Math.max(0, Math.round(Number(input.durationMs || 0))),
    transcript: String(input.transcript || ""),
  };
}

function blobToDataUrl(blob) {
  if (!blob) return Promise.reject(new Error("Voice blob is missing"));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Cannot read voice"));
    reader.readAsDataURL(blob);
  });
}

function readBlobAsArrayBuffer(blob) {
  if (!blob) return Promise.reject(new Error("Blob is missing"));
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Cannot read blob"));
    reader.readAsArrayBuffer(blob);
  });
}

function dataUrlToArrayBuffer(dataUrl) {
  const commaIdx = dataUrl.indexOf(",");
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function encryptAndUploadFile(file, chatId) {
  const buf = await readBlobAsArrayBuffer(file);
  return encryptAndUploadBuffer(buf, {
    fileName: file.name || "file",
    mimeType: file.type || "application/octet-stream",
  }, chatId);
}

async function encryptAndUploadBuffer(buf, meta, chatId) {
  if (!window.e2ee?.encryptFile) throw new Error("Нет клиентского шифрования файла");
  const { encrypted, fileKey } = await window.e2ee.encryptFile(buf);
  const uploadResult = await api.uploadAttachment(encrypted, chatId);
  const attachmentId = uploadResult?.id || uploadResult?.attachmentId;
  if (!attachmentId) throw new Error("Сервер не принял файл");
  return {
    attachmentId,
    fileKey,
    fileName: meta.fileName || "file",
    mimeType: meta.mimeType || "application/octet-stream",
    size: buf.byteLength || meta.size || 0,
    durationMs: meta.durationMs || 0,
    width: meta.width,
    height: meta.height,
    transcript: meta.transcript || "",
  };
}

function compactReplyTo(replyTo) {
  if (!replyTo) return null;
  return {
    id: replyTo.id ?? replyTo.messageId ?? null,
    _text: String(replyTo._text || replyTo.content || "").slice(0, 500),
    _img: Boolean(replyTo._img),
    _voice: Boolean(replyTo._voice),
    _videoNote: Boolean(replyTo._videoNote),
  };
}

function isInlineDataSrc(value) {
  return String(value || "").startsWith("data:");
}

function playbackMime(mime, fallback = "application/octet-stream") {
  const raw = String(mime || fallback || "").split(";")[0].trim();
  return raw || fallback;
}

function needsAttachmentHydration(msg) {
  if (!msg?._attachment?.attachmentId || !window.e2ee?.decryptFile) return false;
  if (msg._attachment.objectUrl) return false;
  const type = msg._payload?.type;
  if (type === "image" && isInlineDataSrc(msg._img)) return false;
  if (type === "voice" && isInlineDataSrc(msg._voice?.dataUrl)) return false;
  if (type === "video_note" && isInlineDataSrc(msg._videoNote?.src)) return false;
  return true;
}

async function hydrateAttachment(attachment, payloadType) {
  const encryptedBuf = await api.downloadAttachment(attachment.attachmentId);
  const decryptedBuf = await window.e2ee.decryptFile(encryptedBuf, attachment.fileKey);
  const mime = playbackMime(attachment.mimeType, payloadType === "video_note" ? "video/webm" : "application/octet-stream");
  const blob = new Blob([decryptedBuf], { type: mime });
  const objectUrl = URL.createObjectURL(blob);
  const next = { ...attachment, mimeType: mime, objectUrl, blob };
  const type = payloadType || "";
  if (type === "image" || mime.startsWith("image/")) {
    return { attachment: next, img: objectUrl, voice: null, videoNote: null };
  }
  if (type === "voice" || mime.startsWith("audio/")) {
    return {
      attachment: next,
      img: null,
      voice: {
        dataUrl: objectUrl,
        durationMs: attachment.durationMs || 0,
        mime: mime || "audio/webm",
        transcript: attachment.transcript || "",
      },
      videoNote: null,
    };
  }
  if (type === "video_note" || type === "video" || mime.startsWith("video/")) {
    return {
      attachment: next,
      img: null,
      voice: null,
      videoNote: { src: objectUrl, durationMs: attachment.durationMs || 0, mime: mime || "video/webm" },
    };
  }
  return { attachment: next, img: null, voice: null, videoNote: null };
}
