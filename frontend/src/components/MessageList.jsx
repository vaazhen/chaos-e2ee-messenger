import { useRef, useEffect, useLayoutEffect, useState, useCallback } from "react";
import Ava from "./Ava";
import VoiceMessage from "./VoiceMessage";
import { FileIcon, CheckIcon, DoubleCheckIcon, ChevronDownIcon } from "./Icons";
import { findWordStartMatches, getTime } from "../helpers";

const chatScrollStore = new Map();

export default function MessageList({
  msgs,
  me,
  activeChat,
  loadingMsgs,
  onContextMenu,
  onReact,
  searchQuery = "",
  typingUsername,
  activeMatchId,
  scrollToMessageId,
}) {
  const endRef = useRef(null);
  const listRef = useRef(null);
  const prevChatIdRef = useRef(null);
  const prevLenRef = useRef(0);
  const prevLastIdRef = useRef(null);
  const restoredRef = useRef(false);
  const [showDownBtn, setShowDownBtn] = useState(false);

  useLayoutEffect(() => {
    if (loadingMsgs || !msgs?.length || restoredRef.current) return;
    const el = listRef.current;
    if (!el) return;
    const chatId = activeChat?.id;
    if (!chatId) return;
    restoredRef.current = true;
    const saved = chatScrollStore.get(chatId);
    el.scrollTop = saved?.top != null
      ? Math.min(saved.top, el.scrollHeight - el.clientHeight)
      : el.scrollHeight;
  });

  useEffect(() => {
    const chatId = activeChat?.id ?? null;
    if (prevChatIdRef.current !== chatId) {
      if (prevChatIdRef.current != null) {
        const el = listRef.current;
        if (el) chatScrollStore.set(prevChatIdRef.current, { top: el.scrollTop, height: el.scrollHeight });
      }
      prevChatIdRef.current = chatId;
      restoredRef.current = false;
      prevLenRef.current = 0;
      prevLastIdRef.current = null;
    }
    return () => {
      const el = listRef.current;
      const cid = activeChat?.id ?? null;
      if (el && cid != null) chatScrollStore.set(cid, { top: el.scrollTop, height: el.scrollHeight });
    };
  }, [activeChat?.id]);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (!msgs?.length) return;
    if (!restoredRef.current) return;

    const bottomGap = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = bottomGap < 140;

    const last = msgs[msgs.length - 1];
    const lastId = last?.id ?? last?.messageId ?? `len:${msgs.length}`;
    const grew = msgs.length >= (prevLenRef.current || 0);
    const newTail = prevLastIdRef.current != null && lastId !== prevLastIdRef.current;
    const appended = grew && newTail;

    if (nearBottom && appended) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    prevLenRef.current = msgs.length;
    prevLastIdRef.current = lastId;
  }, [msgs]);

  useEffect(() => {
    if (!scrollToMessageId) return;
    const el = listRef.current;
    if (!el) return;
    const target = el.querySelector?.(`[data-mid="${String(scrollToMessageId)}"]`);
    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [scrollToMessageId]);

  const onScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const gapBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowDownBtn(gapBottom > 200);
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  if (loadingMsgs) {
    return (
      <div ref={listRef} className="msgs scroll">
        <div className="loading-msgs"><div className="spinner" /></div>
      </div>
    );
  }

  if (!msgs.length) {
    return (
      <div ref={listRef} className="msgs scroll">
        <div className="product-empty">
          <div className="product-empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
          <div className="product-empty-title">Нет сообщений</div>
          <div className="product-empty-sub">Создайте новую переписку.</div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div ref={listRef} className="msgs scroll" onScroll={onScroll}>
      <div className="date-div">today</div>

      {msgs.map((msg, idx) => {
        const isOut = msg._out ?? (msg.senderId === me?.id);
        const next = msgs[idx + 1];
        const isGroupEnd = !next || ((next._out ?? (next.senderId === me?.id)) !== isOut);
        const text = msg._text ?? msg.content ?? "[encrypted]";
        const time = msg._time ?? getTime(msg.createdAt);
        const reactions = msg.reactions || {};
        const myReactions = msg.myReactions || [];
        const isActiveHit = activeMatchId && String(activeMatchId) === String(msg.id ?? msg.messageId);
        const shouldHighlightMessage = Boolean(searchQuery?.trim()) && Boolean(isActiveHit);
        const attachment = msg._attachment;
        const isFileAttachment = attachment && !msg._img && !msg._voice && attachment.fileName;

        return (
          <MsgRow
            key={msg.id ?? idx}
            msg={msg}
            isOut={isOut}
            isGroupEnd={isGroupEnd}
            text={text}
            time={time}
            reactions={reactions}
            myReactions={myReactions}
            shouldHighlightMessage={shouldHighlightMessage}
            searchQuery={searchQuery}
            activeChat={activeChat}
            onContextMenu={onContextMenu}
            onReact={onReact}
            isFileAttachment={isFileAttachment}
            attachment={attachment}
          />
        );
      })}

      {typingUsername && (
        <div className="msg-wrap">
          <Ava name={typingUsername} colorIdx={0} size="sm" />
          <div className="typing">
            <div className="td" /><div className="td" /><div className="td" />
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
    {showDownBtn && (
      <button className="scroll-bottom-btn" onClick={scrollToBottom} aria-label="Scroll to bottom">
        <ChevronDownIcon />
      </button>
    )}
    </>
  );
}

function MsgRow({
  msg, isOut, isGroupEnd, text, time, reactions, myReactions,
  shouldHighlightMessage, searchQuery, activeChat, onContextMenu, onReact,
  isFileAttachment, attachment,
}) {
  const [expiring, setExpiring] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!msg.expiresAt) return;
    const expiresMs = new Date(msg.expiresAt).getTime();
    if (!Number.isFinite(expiresMs)) return;

    const tick = () => {
      const remaining = expiresMs - Date.now();
      if (remaining <= 0) {
        setExpiring(true);
        setTimeout(() => setHidden(true), 500);
        return;
      }
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
    <div
      data-mid={String(msg.id ?? msg.messageId ?? "")}
      className={`msg-wrap${isOut ? " out" : ""}${shouldHighlightMessage ? " search-hit-active" : ""}${expiring ? " msg-expiring" : ""}`}
      onContextMenu={e => onContextMenu(e, { ...msg, _text: text, _out: isOut })}
    >
      {!isOut && (
        isGroupEnd
          ? <Ava name={activeChat?.name} colorIdx={activeChat?.colorIdx} size="sm" avatarUrl={activeChat?.avatarUrl} />
          : <div style={{ width: 28, flexShrink: 0 }} />
      )}

      <div
        className={`bubble ${isOut ? "out" : "in"}${isGroupEnd ? (isOut ? " tl-out" : " tl-in") : ""}`}
        onClick={e => e.stopPropagation()}
      >
        {msg._replyTo && (
          <div className="reply-quote">
            <div className="reply-q-name">Ответить</div>
            <div className="reply-q-text">{msg._replyTo._text}</div>
          </div>
        )}

        {msg._img && <img className="msg-img" src={msg._img} alt="" />}

        {msg._voice && (
          <VoiceMessage
            src={msg._voice.dataUrl}
            durationMs={msg._voice.durationMs}
            variant={isOut ? "out" : "in"}
          />
        )}

        {isFileAttachment && (
          <div className="msg-file" onClick={downloadFile}>
            <MsgFileIcon name={attachment.fileName} />
            <div className="msg-file-info">
              <div className="msg-file-name">{attachment.fileName}</div>
              {attachment.size > 0 && <div className="msg-file-size">{fmtSize(attachment.size)}</div>}
            </div>
          </div>
        )}

        {text && <span>{renderHighlightedText(text, shouldHighlightMessage ? searchQuery : "")}</span>}

        {msg.expiresAt && countdown && (
          <div className="msg-ttl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2" /><path d="M10 2h4" />
            </svg>
            <span>{countdown}</span>
          </div>
        )}

        <div className="msg-meta">
          {msg.editedAt && <span className="edited-mark">edited</span>}
          <span>{time}</span>
          {isOut && (
            <span className={`check${msg.status === "READ" ? " read" : ""}`}>
              {msg.status === "READ" ? <DoubleCheckIcon /> : <CheckIcon />}
            </span>
          )}
        </div>

        {Object.keys(reactions).length > 0 && (
          <div className="message-reactions">
            {Object.entries(reactions).map(([emoji, count]) => (
              <button
                key={emoji}
                type="button"
                className={`reaction-chip${myReactions.includes(emoji) ? " mine" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onReact?.({ ...msg, _text: text, _out: isOut }, emoji);
                }}
              >
                <span>{emoji}</span>
                <span>{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MsgFileIcon({ name }) {
  return <div className="msg-file-icon"><FileIcon /></div>;
}

function fmtSize(bytes) {
  if (!bytes || bytes < 0) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function renderHighlightedText(text, query) {
  const source = String(text || "");
  const q = String(query || "").trim();
  if (!q) return source;

  const hits = findWordStartMatches(source, q);
  if (!hits.length) return source;

  const parts = [];
  let pos = 0;
  for (const idx of hits) {
    if (idx > pos) parts.push(source.slice(pos, idx));
    parts.push(
      <mark className="msg-search-mark" key={`${idx}-${q}`}>
        {source.slice(idx, idx + q.length)}
      </mark>
    );
    pos = idx + q.length;
  }

  if (pos < source.length) {
    parts.push(source.slice(pos));
  }

  return parts;
}
