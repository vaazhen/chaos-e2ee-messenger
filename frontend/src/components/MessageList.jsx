import { useRef, useEffect, useLayoutEffect, useState, useCallback } from "react";
import Ava from "./Ava";
import { ChevronDownIcon } from "./Icons";
import { MsgRow } from "./MsgRow";
import { getTime } from "../helpers";

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
