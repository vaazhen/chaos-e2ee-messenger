import { useRef, useEffect, useLayoutEffect, useState, useCallback } from "react";
import Ava from "./Ava";
import { ChevronDownIcon } from "./Icons";
import { MsgRow } from "./MsgRow";
import { getTime } from "../helpers";

const chatScrollStore = new Map();
const NEAR_BOTTOM_PX = 140;

function snapshotScroll(el) {
  return {
    top: el.scrollTop,
    height: el.scrollHeight,
    client: el.clientHeight,
  };
}

function jumpToBottom(el) {
  if (!el) return;
  el.scrollTop = el.scrollHeight;
}

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
  unreadCount = 0,
  onPinChange,
  onReachedBottom,
}) {
  const endRef = useRef(null);
  const listRef = useRef(null);
  const contentRef = useRef(null);
  const prevChatIdRef = useRef(null);
  const restoredForChatRef = useRef(null);
  const pinToBottomRef = useRef(true);
  const [showDownBtn, setShowDownBtn] = useState(false);

  const persistScroll = useCallback((chatId) => {
    const el = listRef.current;
    if (!el || chatId == null) return;
    chatScrollStore.set(chatId, {
      ...snapshotScroll(el),
      pin: pinToBottomRef.current,
    });
  }, []);

  const setPinned = useCallback((pinned) => {
    if (pinToBottomRef.current === pinned) return;
    pinToBottomRef.current = pinned;
    onPinChange?.(pinned);
  }, [onPinChange]);

  const applyPinnedScroll = useCallback(() => {
    const el = listRef.current;
    if (!el || !pinToBottomRef.current) return;
    jumpToBottom(el);
  }, []);

  useLayoutEffect(() => {
    const chatId = activeChat?.id ?? null;
    const el = listRef.current;
    if (prevChatIdRef.current !== chatId) {
      prevChatIdRef.current = chatId;
      restoredForChatRef.current = null;
    }

    if (!el || !msgs?.length || chatId == null) return;

    if (restoredForChatRef.current !== chatId) {
      const saved = chatScrollStore.get(chatId);
      if (saved?.pin === false && saved.top != null) {
        pinToBottomRef.current = false;
        onPinChange?.(false);
        const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
        el.scrollTop = Math.min(saved.top, maxTop);
      } else {
        pinToBottomRef.current = true;
        onPinChange?.(true);
        jumpToBottom(el);
        onReachedBottom?.();
      }
      restoredForChatRef.current = chatId;
      persistScroll(chatId);
      setShowDownBtn(!pinToBottomRef.current);
    } else if (pinToBottomRef.current) {
      jumpToBottom(el);
    }
  }, [activeChat?.id, msgs, persistScroll, onPinChange, onReachedBottom]);

  useEffect(() => {
    const el = listRef.current;
    const content = contentRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => applyPinnedScroll());
    ro.observe(el);
    if (content) ro.observe(content);
    return () => ro.disconnect();
  }, [activeChat?.id, msgs?.length, applyPinnedScroll]);

  useEffect(() => {
    return () => persistScroll(prevChatIdRef.current);
  }, [persistScroll]);

  useEffect(() => {
    if (!scrollToMessageId) return;
    const el = listRef.current;
    if (!el) return;
    pinToBottomRef.current = false;
    onPinChange?.(false);
    setShowDownBtn(true);
    const target = el.querySelector?.(`[data-mid="${String(scrollToMessageId)}"]`);
    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [scrollToMessageId, onPinChange]);

  const onScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const gapBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const pinned = gapBottom < NEAR_BOTTOM_PX;
    const wasPinned = pinToBottomRef.current;
    setPinned(pinned);
    setShowDownBtn(gapBottom > 200);
    persistScroll(activeChat?.id ?? prevChatIdRef.current);
    if (pinned && !wasPinned) onReachedBottom?.();
  }, [activeChat?.id, persistScroll, setPinned, onReachedBottom]);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setPinned(true);
    setShowDownBtn(false);
    onReachedBottom?.();
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [setPinned, onReachedBottom]);

  if (loadingMsgs && !msgs?.length) {
    return (
      <div className="msgs-shell">
        <div ref={listRef} className="msgs scroll">
          <div className="loading-msgs"><div className="spinner" /></div>
        </div>
      </div>
    );
  }

  if (!msgs.length) {
    return (
      <div className="msgs-shell">
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
      </div>
    );
  }

  return (
    <div className="msgs-shell">
    <div ref={listRef} className="msgs scroll" onScroll={onScroll}>
      <div ref={contentRef} className="msgs-content">
      <div className="date-div">today</div>

      {msgs.map((msg, idx) => {
        const isOut = msg._out ?? (msg.senderId === me?.id);
        const prev = msgs[idx - 1];
        const next = msgs[idx + 1];
        const actorKey = messageActorKey(msg, me?.id);
        const prevKey = prev ? messageActorKey(prev, me?.id) : null;
        const nextKey = next ? messageActorKey(next, me?.id) : null;
        const isClusterStart = prevKey !== actorKey;
        const isGroupEnd = nextKey !== actorKey;
        const cluster = !isClusterStart && !isGroupEnd
          ? "middle"
          : isClusterStart && !isGroupEnd
            ? "first"
            : !isClusterStart && isGroupEnd
              ? "last"
              : "standalone";
        const sender = resolveIncomingSender(activeChat, msg, isOut);
        const isEnter = isOut && idx === msgs.length - 1;
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
            cluster={cluster}
            isEnter={isEnter}
            text={text}
            time={time}
            reactions={reactions}
            myReactions={myReactions}
            shouldHighlightMessage={shouldHighlightMessage}
            searchQuery={searchQuery}
            activeChat={activeChat}
            senderName={sender.name}
            senderAvatarUrl={sender.avatarUrl}
            senderColorIdx={sender.colorIdx}
            showSenderName={!isOut && activeChat?.type === "group" && isClusterStart}
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
    </div>
    {showDownBtn && (
      <button
        type="button"
        className={`scroll-bottom-btn${unreadCount > 0 ? " has-unread" : ""}`}
        onClick={scrollToBottom}
        aria-label={unreadCount > 0 ? `Scroll to bottom, ${unreadCount} unread` : "Scroll to bottom"}
      >
        {unreadCount > 0 && (
          <span className="scroll-bottom-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
        <ChevronDownIcon />
      </button>
    )}
    </div>
  );
}

function messageActorKey(msg, meId) {
  if (msg?.senderId != null && msg.senderId !== "") return `u:${msg.senderId}`;
  const isOut = msg?._out ?? (msg?.senderId === meId);
  return isOut ? "out" : "in";
}

function participantName(p) {
  if (!p) return "";
  return `${p.firstName || ""} ${p.lastName || ""}`.trim() || p.username || String(p.userId || "");
}

function resolveIncomingSender(chat, msg, isOut) {
  if (isOut) return { name: "", avatarUrl: "", colorIdx: 0 };
  const participants = Array.isArray(chat?.groupParticipants) ? chat.groupParticipants : [];
  const person = participants.find((p) => String(p.userId) === String(msg?.senderId));
  if (person) {
    return {
      name: participantName(person),
      avatarUrl: person.avatarUrl || "",
      colorIdx: Number(person.userId || 0) % 7,
    };
  }
  return {
    name: chat?.name || "",
    avatarUrl: chat?.avatarUrl || "",
    colorIdx: chat?.colorIdx ?? 0,
  };
}
