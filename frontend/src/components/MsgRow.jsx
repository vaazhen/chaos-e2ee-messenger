import { useEffect, useState } from "react";
import Ava from "./Ava";
import VoiceMessage from "./VoiceMessage";
import { FileIcon, CheckIcon, DoubleCheckIcon } from "./Icons";
import { getTime, findWordStartMatches } from "../helpers";

/**
 * Single message bubble — text, images, voice, files, reactions, expiry countdown.
 */
export function MsgRow({ msg, isOut, isGroupEnd, text, time, reactions, myReactions, shouldHighlightMessage, searchQuery, activeChat, onContextMenu, onReact, isFileAttachment, attachment }) {
  const [expiring, setExpiring] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!msg.expiresAt) return;
    const expiresMs = new Date(msg.expiresAt).getTime();
    if (!Number.isFinite(expiresMs)) return;
    const tick = () => {
      const remaining = expiresMs - Date.now();
      if (remaining <= 0) { setExpiring(true); setTimeout(() => setHidden(true), 500); return; }
      if (remaining < 60000) setCountdown(`${Math.ceil(remaining / 1000)}s`);
      else if (remaining < 3600000) setCountdown(`${Math.ceil(remaining / 60000)}m`);
      else setCountdown(`${Math.ceil(remaining / 3600000)}h`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [msg.expiresAt]);

  if (hidden) return null;

  const downloadFile = (e) => {
    e.stopPropagation();
    if (!attachment?.objectUrl) return;
    const a = document.createElement("a");
    a.href = attachment.objectUrl;
    a.download = attachment.fileName || "file";
    a.click();
  };

  return (
    <div data-mid={String(msg.id ?? msg.messageId ?? "")} className={`msg-wrap${isOut ? " out" : ""}${shouldHighlightMessage ? " search-hit-active" : ""}${expiring ? " msg-expiring" : ""}`} onContextMenu={e => onContextMenu(e, { ...msg, _text: text, _out: isOut })}>
      {!isOut && (isGroupEnd ? <Ava name={activeChat?.name} colorIdx={activeChat?.colorIdx} size="sm" avatarUrl={activeChat?.avatarUrl} /> : <div style={{ width: 28, flexShrink: 0 }} />)}
      <div className={`bubble ${isOut ? "out" : "in"}${isGroupEnd ? (isOut ? " tl-out" : " tl-in") : ""}`} onClick={e => e.stopPropagation()}>
        {msg._replyTo && <div className="reply-quote"><div className="reply-q-name">Ответить</div><div className="reply-q-text">{msg._replyTo._text}</div></div>}
        {msg._img && <img className="msg-img" src={msg._img} alt="" />}
        {msg._voice && <VoiceMessage src={msg._voice.dataUrl} durationMs={msg._voice.durationMs} variant={isOut ? "out" : "in"} />}
        {isFileAttachment && <div className="msg-file" onClick={downloadFile}><div className="msg-file-icon"><FileIcon /></div><div className="msg-file-info"><div className="msg-file-name">{attachment.fileName}</div>{attachment.size > 0 && <div className="msg-file-size">{fmtSize(attachment.size)}</div>}</div></div>}
        {text && <span>{renderHighlightedText(text, shouldHighlightMessage ? searchQuery : "")}</span>}
        {msg.expiresAt && countdown && <div className="msg-ttl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2" /><path d="M10 2h4" /></svg><span>{countdown}</span></div>}
        <div className="msg-meta">{!!msg.editedAt && <span className="edited-mark">edited</span>}<span>{time}</span>{isOut && <span className={`check${msg.status === "READ" ? " read" : ""}`}>{msg.status === "READ" ? <DoubleCheckIcon /> : <CheckIcon />}</span>}</div>
        {Object.keys(reactions).length > 0 && <div className="message-reactions">{Object.entries(reactions).map(([emoji, count]) => <button key={emoji} type="button" className={`reaction-chip${myReactions.includes(emoji) ? " mine" : ""}`} onClick={e => { e.stopPropagation(); onReact?.({ ...msg, _text: text, _out: isOut }, emoji); }}><span>{emoji}</span><span>{count}</span></button>)}</div>}
      </div>
    </div>
  );
}

function fmtSize(bytes) {
  if (!bytes || bytes < 0) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

/** Inline text search highlight. */
export function renderHighlightedText(text, query) {
  const source = String(text || "");
  const q = String(query || "").trim();
  if (!q) return source;
  const hits = findWordStartMatches(source, q);
  if (!hits.length) return source;
  const parts = []; let pos = 0;
  for (const idx of hits) {
    if (idx > pos) parts.push(source.slice(pos, idx));
    parts.push(<mark className="msg-search-mark" key={`${idx}-${q}`}>{source.slice(idx, idx + q.length)}</mark>);
    pos = idx + q.length;
  }
  if (pos < source.length) parts.push(source.slice(pos));
  return parts;
}
