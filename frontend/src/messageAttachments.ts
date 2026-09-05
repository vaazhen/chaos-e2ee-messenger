import { api } from "./api";
import { getE2ee } from "./e2ee";
import { compressImageToDataUrl, IMAGE_PROFILES } from "./imagePipeline";
import { isInlineDataSrc, playbackMime } from "./messageModel";
import type { MessageAttachment, MessagePayloadType, ParsedMessage, TimelineMessage } from "./types/protocol";

function cryptoSource(bytes: Uint8Array): BufferSource {
  return bytes as unknown as BufferSource;
}

export interface CompressedImageFile {
  dataUrl: string;
  mime: string;
  name: string;
  originalMime: string | null;
  originalSize: number;
  size: number;
  width: number;
  height: number;
}

export interface VoicePrepareInput {
  dataUrl?: string | undefined;
  blob?: Blob | undefined;
  file?: Blob | undefined;
  mime?: string | undefined;
  name?: string | undefined;
  size?: number | undefined;
  durationMs?: number | undefined;
  transcript?: string | undefined;
}

export interface PreparedVoiceFile {
  dataUrl: string;
  mime: string;
  name: string;
  size: number;
  durationMs: number;
  transcript: string;
}

export interface AttachmentUploadMeta {
  fileName?: string | undefined;
  mimeType?: string | undefined;
  size?: number | undefined;
  durationMs?: number | undefined;
  width?: number | undefined;
  height?: number | undefined;
  transcript?: string | undefined;
}

export interface HydratedAttachment {
  attachment: MessageAttachment;
  img: string | null;
  voice: ParsedMessage["voice"];
  videoNote: ParsedMessage["videoNote"];
}

type UploadAttachmentResult = {
  id?: string | undefined;
  attachmentId?: string | undefined;
};

export async function compressImageFile(file: File): Promise<CompressedImageFile> {
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

export async function prepareVoiceFile(input: VoicePrepareInput): Promise<PreparedVoiceFile> {
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

export function blobToDataUrl(blob: Blob | null | undefined): Promise<string> {
  if (!blob) return Promise.reject(new Error("Voice blob is missing"));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Cannot read voice"));
    reader.readAsDataURL(blob);
  });
}

export function readBlobAsArrayBuffer(blob: Blob | null | undefined): Promise<ArrayBuffer> {
  if (!blob) return Promise.reject(new Error("Blob is missing"));
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error || new Error("Cannot read blob"));
    reader.readAsArrayBuffer(blob);
  });
}

export function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const commaIdx = dataUrl.indexOf(",");
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function encryptAndUploadFile(file: File, chatId: string | number | null): Promise<MessageAttachment> {
  const buf = await readBlobAsArrayBuffer(file);
  return encryptAndUploadBuffer(buf, {
    fileName: file.name || "file",
    mimeType: file.type || "application/octet-stream",
  }, chatId);
}

export async function encryptAndUploadBuffer(
  buf: ArrayBuffer,
  meta: AttachmentUploadMeta,
  chatId: string | number | null,
): Promise<MessageAttachment> {
  const e2ee = getE2ee();
  if (!e2ee?.encryptFile) throw new Error("Нет клиентского шифрования файла");
  const { encrypted, fileKey } = await e2ee.encryptFile(buf);
  const uploadAttachment = api.uploadAttachment as (
    encrypted: Uint8Array,
    uploadChatId?: string | number | null,
  ) => Promise<UploadAttachmentResult>;
  const uploadResult = await uploadAttachment(encrypted, chatId);
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

export function needsAttachmentHydration(msg: TimelineMessage | null | undefined): boolean {
  if (!msg?._attachment?.attachmentId || !getE2ee()?.decryptFile) return false;
  if (msg._attachment.objectUrl) return false;
  const type = msg._payload?.type;
  if (type === "image" && isInlineDataSrc(msg._img)) return false;
  if (type === "voice" && isInlineDataSrc((msg._voice as { dataUrl?: string } | null | undefined)?.dataUrl)) return false;
  if (type === "video_note" && isInlineDataSrc((msg._videoNote as { src?: string } | null | undefined)?.src)) return false;
  return true;
}

export async function hydrateAttachment(
  attachment: MessageAttachment,
  payloadType?: MessagePayloadType | null,
): Promise<HydratedAttachment> {
  const e2ee = getE2ee();
  const encryptedBuf = await api.downloadAttachment(attachment.attachmentId);
  const decryptedBuf = await e2ee!.decryptFile(encryptedBuf, attachment.fileKey as string);
  const mime = playbackMime(attachment.mimeType, payloadType === "video_note" ? "video/webm" : "application/octet-stream");
  const blob = new Blob([cryptoSource(new Uint8Array(decryptedBuf))], { type: mime });
  const objectUrl = URL.createObjectURL(blob);
  const next: MessageAttachment = { ...attachment, mimeType: mime, objectUrl, blob };
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
