import { useState, useCallback } from "react";
import { api, call, getToken, API_BASE } from "../api";
import { getOrCreateDeviceId } from "../deviceId";
import { getTime } from "../helpers";
import { saveMessagePreview } from "../previewCache";
import * as localStore from "../localMessageStore";
import { compressImageToDataUrl, IMAGE_PROFILES } from "../imagePipeline";

const MAX_ENCRYPTED_PAYLOAD_CHARS = 180_000;
const ATTACHMENT_THRESHOLD_BYTES = 50 * 1024;

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
        const existingIds = new Map(cached.map(m => [String(m.id || m.messageId), true]));
        const hidden = loadHiddenMessageIds(myId);
        const newOnes = data.filter(msg => !existingIds.has(String(msg.id || msg.messageId)))
          .filter(msg => !hidden.has(String(msg.id || msg.messageId)))
          .filter(msg => !(msg.deleted === true || msg.deletedAt));
        if (newOnes.length === 0) return;
        const decrypted = [];
        for (const msg of newOnes) {
          decrypted.push(await decryptMsg(msg, myId, chatId));
        }
        await localStore.saveMessages(decrypted);
        setMsgs(prev => {
          const existing = prev[chatId] || [];
          const merged = [...existing];
          for (const d of decrypted) {
            const idx = merged.findIndex(m => String(m.id || m.messageId) === String(d.id || d.messageId));
            if (idx === -1) merged.push(d);
          }
          return { ...prev, [chatId]: merged };
        });
      } catch (e) {
        console.error("syncFromApi:", e);
      }
    };
    const rehydrateCachedAttachments = async (chatId, messages) => {
      const needsRehydrate = messages.filter(m =>
        m._attachment?.attachmentId && !m._img && !m._voice && !m._attachment?.objectUrl && window.e2ee?.decryptFile
      );
      if (needsRehydrate.length === 0) return;
      for (const msg of needsRehydrate) {
        try {
          const encryptedBuf = await api.downloadAttachment(msg._attachment.attachmentId);
          const decryptedBuf = await window.e2ee.decryptFile(encryptedBuf, msg._attachment.fileKey);
          const blob = new Blob([decryptedBuf], { type: msg._attachment.mimeType || "application/octet-stream" });
          const objectUrl = URL.createObjectURL(blob);
          const type = msg._payload?.type || '';
          if (type === 'image') {
            msg._img = objectUrl;
          } else if (type === 'voice') {
            msg._voice = { dataUrl: objectUrl, durationMs: msg._attachment.durationMs || 0, mime: msg._attachment.mimeType };
          } else {
            msg._attachment = { ...msg._attachment, objectUrl, blob };
          }
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
        await localStore.saveMessages(decrypted);
        setMsgs(prev => ({ ...prev, [chatId]: decrypted }));
      }
      if (fromApi) {
        try { await api.markRead(chatId); } catch (_) { /* ignore optional failure */ }
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
        const envelope = {
          ...event.envelope,
          senderDeviceId: event.senderDeviceId || event.envelope?.senderDeviceId,
        };
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
    let resolvedAttachment = parsed.attachment || null;

    if (resolvedAttachment?.attachmentId && window.e2ee?.decryptFile) {
      try {
        const encryptedBuf = await api.downloadAttachment(resolvedAttachment.attachmentId);
        const decryptedBuf = await window.e2ee.decryptFile(encryptedBuf, resolvedAttachment.fileKey);
        const blob = new Blob([decryptedBuf], { type: resolvedAttachment.mimeType || "application/octet-stream" });
        const objectUrl = URL.createObjectURL(blob);

        if (parsed.payload?.type === "image") {
          resolvedImg = objectUrl;
        } else if (parsed.payload?.type === "voice") {
          resolvedVoice = {
            dataUrl: objectUrl,
            durationMs: resolvedAttachment.durationMs || 0,
            mime: resolvedAttachment.mimeType || "audio/webm",
          };
        } else {
          resolvedAttachment = { ...resolvedAttachment, objectUrl, blob };
        }
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
    const generalFile = typeof input === "string" ? null : input?.generalFile;
    const ttl = typeof input === "string" ? null : input?.ttl;
    const replyTo = typeof input === "string" ? null : input?.replyTo;
    if ((!text && !imgFile && !voiceFile && !generalFile) || !chatId) return null;
    if (!window.e2ee?.buildFanoutRequest) {
      console.error("[Send] crypto-engine is not loaded");
      return null;
    }

    const clientMessageId = "tmp_" + Date.now();
    let parsedPayload = { text, img: null, voice: null, payload: null, replyTo };
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
        if (estimateBase64Bytes(image.dataUrl) > ATTACHMENT_THRESHOLD_BYTES && window.e2ee?.encryptFile) {
          const buf = dataUrlToArrayBuffer(image.dataUrl);
          const { encrypted, fileKey } = await window.e2ee.encryptFile(buf);
          const uploadResult = await api.uploadAttachment(encrypted, chatId);
          const attachment = {
            attachmentId: uploadResult.id || uploadResult.attachmentId,
            fileKey,
            fileName: image.name || "image",
            mimeType: image.mime || "image/jpeg",
            size: image.size,
            width: image.width,
            height: image.height,
          };
          parsedPayload = {
            text,
            img: image.dataUrl,
            payload: { v: 1, type: "image", text, attachment },
          };
          encryptedPlaintext = JSON.stringify(parsedPayload.payload);
        } else {
          parsedPayload = {
            text,
            img: image.dataUrl,
            payload: { v: 1, type: "image", text, image },
          };
          encryptedPlaintext = JSON.stringify(parsedPayload.payload);
        }
      } else if (voiceFile) {
        const voice = await prepareVoiceFile(voiceFile);
        if (estimateBase64Bytes(voice.dataUrl) > ATTACHMENT_THRESHOLD_BYTES && window.e2ee?.encryptFile) {
          const buf = dataUrlToArrayBuffer(voice.dataUrl);
          const { encrypted, fileKey } = await window.e2ee.encryptFile(buf);
          const uploadResult = await api.uploadAttachment(encrypted, chatId);
          const attachment = {
            attachmentId: uploadResult.id || uploadResult.attachmentId,
            fileKey,
            fileName: voice.name || "voice-message.webm",
            mimeType: voice.mime || "audio/webm",
            size: voice.size,
            durationMs: voice.durationMs,
          };
          parsedPayload = {
            text,
            img: null,
            voice,
            payload: { v: 1, type: "voice", text, attachment },
          };
          encryptedPlaintext = JSON.stringify(parsedPayload.payload);
        } else {
          parsedPayload = {
            text,
            img: null,
            voice,
            payload: { v: 1, type: "voice", text, voice },
          };
          encryptedPlaintext = JSON.stringify(parsedPayload.payload);
        }
      }
    } catch (e) {
      console.error("[Send] media prepare error:", e);
      return null;
    }

    if (ttl || replyTo) {
      try {
        const payloadObj = encryptedPlaintext.startsWith("{") ? JSON.parse(encryptedPlaintext) : { v: 1, type: "text", text: encryptedPlaintext };
        if (ttl) payloadObj.ttl = ttl;
        if (replyTo) payloadObj.replyTo = replyTo;
        encryptedPlaintext = JSON.stringify(payloadObj);
      } catch (_) {
        const base = { v: 1, type: "text", text: encryptedPlaintext };
        if (ttl) base.ttl = ttl;
        if (replyTo) base.replyTo = replyTo;
        encryptedPlaintext = JSON.stringify(base);
      }
    }

    if (encryptedPlaintext.length > MAX_ENCRYPTED_PAYLOAD_CHARS) {
      console.error("[Send] payload too large after compression");
      return null;
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
      _payload: parsedPayload.payload,
      _attachment: parsedPayload.payload?.attachment || null,
      _ttl: ttl || null,
      _replyTo: replyTo || null,
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
      return null;
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
  const deleteMessage = useCallback(async (chatId, msg, scope = "everyone") => {
    if (!msg?.id) return false;

    setMsgs(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || []).filter(m => String(m.id) !== String(msg.id)),
    }));

    localStore.deleteMessage(msg.id).catch(() => {});

    if (scope === "me" || msg._temp) {
      addHiddenMessageId(myId, msg.id);
      return true;
    }

    try {
      await api.deleteMsg(msg.id);
      return true;
    } catch (e) {
      console.error("[Delete] error:", e);
      setMsgs(prev => {
        const current = prev[chatId] || [];
        if (current.some(m => String(m.id) === String(msg.id))) {
          return prev;
        }
        return {
          ...prev,
          [chatId]: [...current, msg].sort(compareMessages),
        };
      });
      return false;
    }
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

async function decryptMsg(msg, myId, fallbackChatId) {
  let decryptedText = msg.content || "[encrypted]";

  if (decryptedText === "[encrypted]" && msg.envelope && window.e2ee?.decryptEnvelope) {
    try {
      const envelope = {
        ...msg.envelope,
        senderDeviceId: msg.senderDeviceId || msg.envelope?.senderDeviceId,
      };
      decryptedText = await window.e2ee.decryptEnvelope(envelope);
    } catch (e) {
      console.warn("[Timeline] decrypt:", e.message);
    }
  }
  const parsed = parseMessagePayload(decryptedText);

  let resolvedImg = parsed.img;
  let resolvedVoice = parsed.voice;
  let resolvedAttachment = parsed.attachment || null;

  if (resolvedAttachment?.attachmentId && window.e2ee?.decryptFile) {
    try {
      const encryptedBuf = await api.downloadAttachment(resolvedAttachment.attachmentId);
      const decryptedBuf = await window.e2ee.decryptFile(encryptedBuf, resolvedAttachment.fileKey);
      const blob = new Blob([decryptedBuf], { type: resolvedAttachment.mimeType || "application/octet-stream" });
      const objectUrl = URL.createObjectURL(blob);

      if (parsed.payload?.type === "image") {
        resolvedImg = objectUrl;
      } else if (parsed.payload?.type === "voice") {
        resolvedVoice = {
          dataUrl: objectUrl,
          durationMs: resolvedAttachment.durationMs || 0,
          mime: resolvedAttachment.mimeType || "audio/webm",
        };
      } else {
        resolvedAttachment = { ...resolvedAttachment, objectUrl, blob };
      }
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
  if (msg._img || msg._voice || msg._attachment) return true;
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

function compareMessages(a, b) {
  const aTime = Date.parse(a?.createdAt || "") || 0;
  const bTime = Date.parse(b?.createdAt || "") || 0;
  if (aTime !== bTime) return aTime - bTime;
  return String(a?.id || "").localeCompare(String(b?.id || ""));
}

function parseMessagePayload(raw) {
  const fallbackText = String(raw || "");
  if (!fallbackText || fallbackText === "[encrypted]") {
    return { text: fallbackText, img: null, voice: null, payload: null, attachment: null, replyTo: null };
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
        payload,
        attachment,
        ttl: payload.ttl || null,
        replyTo: payload.replyTo || null,
      };
    }
    if (payload?.v === 1 && payload?.type === "voice") {
      const voice = payload.voice || {};
      const attachment = payload.attachment || null;
      return {
        text: String(payload.text || ""),
        img: null,
        voice: voice.dataUrl ? voice : null,
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
        payload,
        attachment: null,
        ttl: payload.ttl || null,
        replyTo: payload.replyTo || null,
      };
    }
  } catch (_) {
    // regular text message
  }
  return { text: fallbackText, img: null, voice: null, payload: null, attachment: null, replyTo: null };
}

function messagePreview(parsed) {
  if (parsed?.attachment?.attachmentId && parsed?.payload?.type === "file") {
    const name = parsed.attachment.fileName || "File";
    return parsed.text ? `📎 ${parsed.text}` : `📎 ${name}`;
  }
  if (parsed?.img) return parsed.text ? `📷 ${parsed.text}` : "📷 Photo";
  if (parsed?.voice) return parsed.text ? `Voice: ${parsed.text}` : "Voice message";
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

function estimateBase64Bytes(dataUrl) {
  if (!dataUrl) return 0;
  const commaIdx = dataUrl.indexOf(",");
  const base64Part = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  return Math.round((base64Part.length * 3) / 4);
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
  const buf = await file.arrayBuffer();
  const { encrypted, fileKey } = await window.e2ee.encryptFile(buf);
  const uploadResult = await api.uploadAttachment(encrypted, chatId);
  return {
    attachmentId: uploadResult.id || uploadResult.attachmentId,
    fileKey,
    fileName: file.name || "file",
    mimeType: file.type || "application/octet-stream",
    size: file.size || 0,
  };
}
