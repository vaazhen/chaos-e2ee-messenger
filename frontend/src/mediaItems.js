export function mediaKindForMessage(msg) {
  if (!msg) return null;
  if (msg._img) return "image";
  if (msg._videoNote) return "video_note";
  const mime = String(msg._attachment?.mimeType || "");
  if (mime.startsWith("video/")) return "video";
  if (msg._voice) return "voice";
  if (msg._attachment?.fileName || msg._attachment?.objectUrl) return "file";
  return null;
}

export function collectMediaItems(msgs) {
  const items = [];
  for (const msg of msgs || []) {
    const messageId = String(msg.id ?? msg.messageId ?? "");
    const attachment = msg._attachment || {};
    if (msg._img) {
      items.push({
        id: `${messageId}:image`,
        messageId,
        kind: "image",
        src: msg._img,
        name: attachment.fileName || "photo",
        mime: attachment.mimeType || "image/jpeg",
        blob: attachment.blob || null,
      });
      continue;
    }
    if (msg._videoNote?.src) {
      items.push({
        id: `${messageId}:video_note`,
        messageId,
        kind: "video_note",
        src: msg._videoNote.src,
        name: attachment.fileName || "video-note",
        mime: msg._videoNote.mime || attachment.mimeType || "video/webm",
        blob: attachment.blob || null,
      });
      continue;
    }
    if (String(attachment.mimeType || "").startsWith("video/") && attachment.objectUrl) {
      items.push({
        id: `${messageId}:video`,
        messageId,
        kind: "video",
        src: attachment.objectUrl,
        name: attachment.fileName || "video",
        mime: attachment.mimeType,
        blob: attachment.blob || null,
      });
      continue;
    }
    if (attachment.fileName || attachment.objectUrl) {
      items.push({
        id: `${messageId}:file`,
        messageId,
        kind: "file",
        src: attachment.objectUrl || "",
        name: attachment.fileName || "file",
        mime: attachment.mimeType || "application/octet-stream",
        blob: attachment.blob || null,
      });
    }
  }
  return items;
}

export function indexOfMediaItem(items, messageId, kind) {
  const id = String(messageId ?? "");
  const exact = items.findIndex((item) => item.messageId === id && (!kind || item.kind === kind));
  if (exact >= 0) return exact;
  return items.findIndex((item) => item.messageId === id);
}
