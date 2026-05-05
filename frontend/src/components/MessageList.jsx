import { useRef, useEffect, useLayoutEffect } from "react";
import Ava from "./Ava";
import VoiceMessage from "./VoiceMessage";
import { findWordStartMatches, getTime } from "../helpers";

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
  const initialScrollDoneRef = useRef(false);
  const prevChatIdRef = useRef(null);
  const prevLenRef = useRef(0);
  const prevLastIdRef = useRef(null);

  useEffect(() => {
    const chatId = activeChat?.id ?? null;
    if (prevChatIdRef.current !== chatId) {
      prevChatIdRef.current = chatId;
      initialScrollDoneRef.current = false;
      prevLenRef.current = 0;
      prevLastIdRef.current = null;
    }
  }, [activeChat?.id]);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (!msgs?.length) return;

    const bottomGap = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = bottomGap < 140;

    const last = msgs[msgs.length - 1];
    const lastId = last?.id ?? last?.messageId ?? `len:${msgs.length}`;
    const grew = msgs.length >= (prevLenRef.current || 0);
    const newTail = prevLastIdRef.current != null && lastId !== prevLastIdRef.current;
    const appended = grew && newTail;

    // First render for a chat: jump to bottom without animation to avoid visible "teleport".
    if (!initialScrollDoneRef.current) {
      initialScrollDoneRef.current = true;
      // Ensure layout is ready (images/voice blocks may affect height).
      requestAnimationFrame(() => {
        const node = listRef.current;
        if (!node) return;
        node.scrollTo({ top: node.scrollHeight, behavior: "auto" });
      });
    } else if (nearBottom && appended) {
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
          <div className="product-empty-icon">◯</div>
          <div className="product-empty-title">Нет сообщений</div>
          <div className="product-empty-sub">Создайте новую переписку.</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={listRef} className="msgs scroll">
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

        return (
          <div
            key={msg.id ?? idx}
            data-mid={String(msg.id ?? msg.messageId ?? "")}
            className={`msg-wrap${isOut ? " out" : ""}${shouldHighlightMessage ? " search-hit-active" : ""}`}
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

              {text && <span>{renderHighlightedText(text, shouldHighlightMessage ? searchQuery : "")}</span>}

              <div className="msg-meta">
                {msg.измененоAt && <span className="изменено-mark">изменено</span>}
                <span>{time}</span>
                {isOut && (
                  <span className={`check${msg.status === "READ" ? " read" : ""}`}>
                    {msg.status === "READ" ? "✓✓" : "✓"}
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
  );
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
