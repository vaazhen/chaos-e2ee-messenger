import { useEffect, useMemo, useRef, useState } from "react";
import { CloseIcon } from "./Icons";

function isTextMime(mime, name) {
  const type = String(mime || "").toLowerCase();
  const lower = String(name || "").toLowerCase();
  return type.startsWith("text/")
    || type === "application/json"
    || type === "application/xml"
    || /\.(txt|md|json|csv|log|xml|js|ts|css|html|svg)$/.test(lower);
}

function isPdf(mime, name) {
  return String(mime || "").toLowerCase() === "application/pdf" || String(name || "").toLowerCase().endsWith(".pdf");
}

function isOffice(mime, name) {
  const type = String(mime || "").toLowerCase();
  const lower = String(name || "").toLowerCase();
  return /officedocument|msword|ms-excel|ms-powerpoint|opendocument/.test(type)
    || /\.(docx?|xlsx?|pptx?|odt|ods|odp)$/.test(lower);
}

function isImage(mime, item) {
  return item?.kind === "image" || String(mime || "").startsWith("image/");
}

function isVideo(mime, item) {
  return item?.kind === "video" || item?.kind === "video_note" || String(mime || "").startsWith("video/");
}

function isAudio(mime, item) {
  return item?.kind === "voice" || String(mime || "").startsWith("audio/");
}

export default function MediaViewer({ items, index, onClose, onIndexChange, l = (ru) => ru }) {
  const [textPreview, setTextPreview] = useState("");
  const swipeRef = useRef(null);
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  const current = safeItems[index] || null;

  const go = (nextIndex) => {
    if (!safeItems.length) return;
    onIndexChange?.(Math.max(0, Math.min(safeItems.length - 1, nextIndex)));
  };

  useEffect(() => {
    if (!current) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
      if (event.key === "ArrowRight") go(index + 1);
      if (event.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, index, onClose, onIndexChange, safeItems.length]);

  useEffect(() => {
    let cancelled = false;
    setTextPreview("");
    if (!current || !isTextMime(current.mime, current.name)) return undefined;
    const load = async () => {
      if (current.blob?.text) return current.blob.text();
      if (current.src) {
        const res = await fetch(current.src);
        return res.text();
      }
      return "";
    };
    load().then((value) => {
      if (!cancelled) setTextPreview(String(value || "").slice(0, 200_000));
    }).catch(() => {
      if (!cancelled) setTextPreview("");
    });
    return () => { cancelled = true; };
  }, [current]);

  const caption = useMemo(() => {
    if (!current) return "";
    return current.name || current.kind || "";
  }, [current]);

  if (!current) return null;

  const download = () => {
    if (!current.src) return;
    const link = document.createElement("a");
    link.href = current.src;
    link.download = current.name || "file";
    link.click();
  };

  return (
    <div className="media-viewer" role="dialog" aria-modal="true" aria-label={l("Просмотр", "Preview")} onClick={onClose}>
      <button type="button" className="media-viewer-close" onClick={onClose} aria-label={l("Закрыть", "Close")}>
        <CloseIcon />
      </button>
      {safeItems.length > 1 && (
        <>
          <button
            type="button"
            className="media-viewer-nav prev"
            disabled={index <= 0}
            onClick={(event) => { event.stopPropagation(); onIndexChange?.(index - 1); }}
          >
            ‹
          </button>
          <button
            type="button"
            className="media-viewer-nav next"
            disabled={index >= safeItems.length - 1}
            onClick={(event) => { event.stopPropagation(); onIndexChange?.(index + 1); }}
          >
            ›
          </button>
        </>
      )}
      <div
        className="media-viewer-stage"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => { swipeRef.current = event.clientX; }}
        onPointerUp={(event) => {
          const start = swipeRef.current;
          swipeRef.current = null;
          if (start == null) return;
          const delta = event.clientX - start;
          if (delta > 60) go(index - 1);
          if (delta < -60) go(index + 1);
        }}
      >
        {isImage(current.mime, current) && <img src={current.src} alt={caption} />}
        {isVideo(current.mime, current) && (
          <video src={current.src} className={current.kind === "video_note" ? "is-circle" : ""} controls autoPlay playsInline />
        )}
        {isAudio(current.mime, current) && <audio src={current.src} controls autoPlay />}
        {isPdf(current.mime, current.name) && <iframe title={caption} src={current.src} />}
        {isTextMime(current.mime, current.name) && <pre className="media-viewer-text">{textPreview || l("Читаю файл…", "Reading file…")}</pre>}
        {!isImage(current.mime, current) && !isVideo(current.mime, current) && !isAudio(current.mime, current) && !isPdf(current.mime, current.name) && !isTextMime(current.mime, current.name) && (
          <div className="media-viewer-file">
            <b>{current.name || l("Файл", "File")}</b>
            <small>
              {isOffice(current.mime, current.name)
                ? l("Word/Excel/PowerPoint внутри чата не рендерятся — скачай файл.", "Office files need to be downloaded to preview.")
                : l("Превью для этого формата откроется после скачивания.", "Preview for this format is available after download.")}
            </small>
            <button type="button" className="media-viewer-download" onClick={download}>{l("Скачать", "Download")}</button>
          </div>
        )}
      </div>
      <div className="media-viewer-meta" onClick={(event) => event.stopPropagation()}>
        <span>{caption}</span>
        {safeItems.length > 1 && <small>{index + 1} / {safeItems.length}</small>}
        <button type="button" className="media-viewer-download" onClick={download}>{l("Скачать", "Download")}</button>
      </div>
    </div>
  );
}
