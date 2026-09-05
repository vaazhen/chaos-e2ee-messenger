import { useState, useCallback } from "react";
import { api, call } from "../api";
import { getE2ee } from "../e2ee";
import { getTime } from "../helpers";
import { saveMessagePreview } from "../previewCache";
import * as localStore from "../localMessageStore";
import {
  addHiddenMessageId,
  adjustReactionSummary,
  buildEditedPayload,
  isEncryptedPlaceholder,
  loadHiddenMessageIds,
  messagePreview,
  playbackMime,
  updateMessageReactions,
} from "../messageModel";
import {
  compressImageFile,
  dataUrlToArrayBuffer,
  encryptAndUploadBuffer,
  encryptAndUploadFile,
  hydrateAttachment,
  needsAttachmentHydration,
  prepareVoiceFile,
  readBlobAsArrayBuffer,
} from "../messageAttachments";
import { decryptMsg, makeCryptoApi, persistDecryptedMessages } from "../messageCrypto";
import {
  applyChatOutgoingStatus,
  applyHydratedAttachments,
  applyIncomingToChat,
  applyMessageStatus,
  appendOptimistic,
  collectNewRemoteMessages,
  confirmOptimistic,
  filterVisibleMessages,
  mergeDecryptedIntoChat,
  removeMessageFromChat,
  rollbackOptimistic,
} from "../messageTimeline";
import {
  applyTtlAndReply,
  assertPayloadSize,
  buildOptimisticMessage,
  isEmptySend,
  MAX_ENCRYPTED_PAYLOAD_CHARS,
  parseSendInput,
} from "../messageSend";

/**
 * React state for per-chat timelines. Encrypt / decrypt / merge live in modules.
 */
export function useMessages(myId) {
  const [msgs, setMsgs] = useState({});
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const loadMessages = useCallback(async (chatId) => {
    if (!chatId) return;
    const hidden = loadHiddenMessageIds(myId);

    const syncFromApi = async (cached) => {
      try {
        const data = await api.getMessages(chatId);
        if (!Array.isArray(data)) return;
        const newOnes = collectNewRemoteMessages(data, cached, hidden);
        if (newOnes.length === 0) return;
        const decrypted = [];
        for (const msg of newOnes) {
          decrypted.push(await decryptMsg(msg, myId, chatId));
        }
        await persistDecryptedMessages(decrypted);
        setMsgs(prev => ({
          ...prev,
          [chatId]: mergeDecryptedIntoChat(prev[chatId] || [], decrypted),
        }));
      } catch (e) {
        console.error("syncFromApi:", e);
      }
    };

    const rehydrateCachedAttachments = async (messages) => {
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
          console.warn("[rehydrate] failed for msg", msg.id, e);
        }
      }
      setMsgs(prev => ({
        ...prev,
        [chatId]: applyHydratedAttachments(prev[chatId] || [], needsRehydrate),
      }));
    };

    setLoadingMsgs(true);
    try {
      let fromApi = false;
      const cached = await localStore.getMessagesByChat(chatId);
      if (cached && cached.length > 0) {
        setMsgs(prev => ({ ...prev, [chatId]: cached }));
        rehydrateCachedAttachments(cached);
        syncFromApi(cached);
      } else {
        fromApi = true;
        const data = await api.getMessages(chatId);
        if (!Array.isArray(data)) return;
        const filtered = filterVisibleMessages(data, hidden);
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
        [chatId]: removeMessageFromChat(prev[chatId] || [], event.messageId),
      }));
      localStore.deleteMessage(event.messageId).catch(() => {});
      return null;
    }

    const msg = await decryptMsg({
      id: messageId,
      chatId,
      senderId: event.senderId,
      senderDeviceId: event.senderDeviceId,
      envelope: event.envelope,
      content: event.content,
      createdAt: event.createdAt,
      editedAt: event.editedAt,
      version: event.version,
      status: event.status || "SENT",
      reactions: event.reactions || {},
      myReactions: event.myReactions || [],
    }, myId, chatId);
    const preview = messagePreview({
      text: msg._text,
      img: msg._img,
      voice: msg._voice,
      payload: msg._payload,
      attachment: msg._attachment,
    });
    const isOut = msg._out;

    setMsgs(prev => ({
      ...prev,
      [chatId]: applyIncomingToChat(prev[chatId] || [], msg, {
        isOut,
        clientMessageId: event.clientMessageId,
      }),
    }));

    if (!isEncryptedPlaceholder(msg)) {
      localStore.saveMessage(msg).catch(() => {});
    }

    return { isOut, text: preview, type: eventType, messageId };
  }, [myId]);

  const updateMessageStatus = useCallback((messageId, status) => {
    setMsgs(prev => applyMessageStatus(prev, messageId, status));
  }, []);

  const updateChatOutgoingStatus = useCallback((chatId, status) => {
    if (!chatId || !status) return;
    setMsgs(prev => ({
      ...prev,
      [chatId]: applyChatOutgoingStatus(prev[chatId] || [], status),
    }));
  }, []);

  const sendMessage = useCallback(async (chatId, input) => {
    const e2ee = getE2ee();
    const parsedInput = parseSendInput(input);
    const { text, imgFile, voiceFile, videoNoteFile, generalFile, ttl, replyTo } = parsedInput;
    if (isEmptySend(parsedInput) || !chatId) return null;
    if (!e2ee?.buildFanoutRequest) {
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
        if (e2ee?.encryptFile) {
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

    encryptedPlaintext = applyTtlAndReply(encryptedPlaintext, ttl, replyTo);
    assertPayloadSize(encryptedPlaintext);

    const tempMsg = buildOptimisticMessage({
      clientMessageId,
      myId,
      parsedPayload,
      encryptedPlaintext,
      ttl,
      replyTo,
      nowText: getTime(),
    });
    setMsgs(prev => ({ ...prev, [chatId]: appendOptimistic(prev[chatId] || [], tempMsg) }));

    try {
      const fanout = await e2ee.buildFanoutRequest(makeCryptoApi(), chatId, encryptedPlaintext);
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
          [chatId]: confirmOptimistic(prev[chatId] || [], clientMessageId, {
            id: savedId,
            status: response.status || "SENT",
            reactions: response.reactions || {},
            myReactions: response.myReactions || [],
          }),
        }));
      }
      return { clientMessageId, response, preview: messagePreview(parsedPayload) };
    } catch (e) {
      console.error("[Send] error:", e);
      setMsgs(prev => ({
        ...prev,
        [chatId]: rollbackOptimistic(prev[chatId] || [], clientMessageId),
      }));
      throw (e instanceof Error ? e : new Error("Сообщение не отправилось"));
    }
  }, [myId]);

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
    const e2ee = getE2ee();
    const text = String(newText || "").trim();
    if (!chatId || !msg?.id || msg._temp || !text) return null;
    if (!e2ee?.buildFanoutRequest) {
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
      const fanout = await e2ee.buildFanoutRequest(makeCryptoApi(), chatId, plaintext);
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

  const deleteMessage = useCallback((chatId, msg, scope = "everyone") => {
    if (!msg?.id) return;

    setMsgs(prev => ({
      ...prev,
      [chatId]: removeMessageFromChat(prev[chatId] || [], msg.id),
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
