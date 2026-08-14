import { useEffect, useMemo, useRef } from "react";
import { CloseIcon, DeleteIcon, FileIcon, SendIcon } from "./Icons";

export default function SendMediaModal({
  kind = "file",
  src = null,
  file = null,
  caption = "",
  error = "",
  onCaptionChange,
  onSend,
  onClose,
  l = (ru) => ru,
}) {
  const captionRef = useRef(null);
  const previewSrc = useMemo(() => {
    if (src) return src;
    if (file && (kind === "image" || kind === "video")) return URL.createObjectURL(file);
    return null;
  }, [src, file, kind]);

  useEffect(() => {
    if (src || !previewSrc || !String(previewSrc).startsWith("blob:")) return undefined;
    return () => URL.revokeObjectURL(previewSrc);
  }, [previewSrc, src]);

  useEffect(() => {
    captionRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const title = l("1 медиа", "1 Media");
  const captionPlaceholder = l("Добавить подпись...", "Add a caption...");

  const submit = (event) => {
    event?.preventDefault?.();
    onSend?.();
  };

  return (
    <div
      className="send-media-modal"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div className="send-media-card" onClick={(event) => event.stopPropagation()}>
        <header className="send-media-head">
          <button type="button" className="send-media-icon-btn" onClick={onClose} aria-label={l("Закрыть", "Close")}>
            <CloseIcon />
          </button>
          <h2 className="send-media-title">{title}</h2>
          <span className="send-media-head-spacer" />
        </header>

        <div className="send-media-stage">
          {kind === "image" && previewSrc && <img src={previewSrc} alt="" />}
          {kind === "video" && previewSrc && <video src={previewSrc} controls playsInline />}
          {kind === "file" && (
            <div className="send-media-file">
              <span className="send-media-file-icon"><FileIcon /></span>
              <b>{file?.name || l("Файл", "File")}</b>
              <small>{formatFileSize(file?.size)}</small>
            </div>
          )}
          <div className="send-media-tools">
            <button
              type="button"
              className="send-media-tool-btn"
              onClick={onClose}
              aria-label={l("Удалить", "Delete")}
              title={l("Удалить", "Delete")}
            >
              <DeleteIcon />
            </button>
          </div>
        </div>

        <form className="send-media-foot" onSubmit={submit}>
          {error ? <div className="send-media-error">{error}</div> : null}
          <div className="send-media-compose">
            <input
              ref={captionRef}
              className="send-media-caption"
              value={caption}
              onChange={(event) => onCaptionChange?.(event.target.value)}
              placeholder={captionPlaceholder}
              aria-label={captionPlaceholder}
            />
            <button type="submit" className="send-media-send" aria-label={l("Отправить", "Send")} title={l("Отправить", "Send")}>
              <SendIcon />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatFileSize(bytes) {
  if (!bytes || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
