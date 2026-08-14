import Ava from "./Ava";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import UserProfileModal from "./UserProfileModal";
import GroupAdminModal from "./GroupAdminModal";
import ChatSearchBar from "./ChatSearchBar";
import { ShieldIcon, BackIcon, PhoneIcon, PhoneOffIcon } from "./Icons";

export default function ChatView({
  chatBg,
  activeChat,
  activeChatName,
  l,
  t,
  goBackToList,
  setProfileOpen,
  setChatSearchOpen,
  groupAdminOpen,
  setGroupAdminOpen,
  openSafetyNumber,
  chatSearchOpen,
  chatSearchRef,
  messageSearch,
  setMessageSearch,
  matchIds,
  matchIndex,
  goToMatch,
  resetMessageSearch,
  setChatBgs,
  me,
  chatStore,
  profileOpen,
  chatMuted,
  toggleMuted,
  onAliasChange,
  activeMsgs,
  loadingMsgs,
  openCtx,
  reactToMsg,
  typingUsername,
  activeMatchId,
  scrollToMessageId,
  unreadCount = 0,
  onPinChange,
  onReachedBottom,
  isRequesterInPendingChat,
  requesterFirstMsgSent,
  sendMsg,
  replyTo,
  setReplyTo,
  sendTyping,
  isPendingRequestChat,
  myGroupMuteUntilMs,
  myGroupMuteCountdown,
  messagePlaceholder,
  callsEnabled = false,
  callPhase = "idle",
  callChatId = null,
  micError = false,
  onStartCall,
  onHangup,
  onOpenMedia,
}) {
  return (
    <section className={`chat-view chat-bg-${chatBg}`}>
      {!activeChat ? (
        <div className="product-empty">
          <div className="product-empty-icon" aria-hidden="true" />
          <div className="product-empty-title">{l("Нет сообщений", "No messages")}</div>
          <div className="product-empty-sub">
            {l("Создайте новую переписку.", "Start a new conversation.")}
          </div>
        </div>
      ) : (
        <>
          <div className="product-chat-head">
            <button className="round-action desktop-hidden" onClick={goBackToList} title={l("Назад", "Back")}><BackIcon /></button>
            <button
              type="button"
              className="chat-head-person"
              onClick={() => {
                if (activeChat.type === "direct") setProfileOpen(true);
                else {
                  setGroupAdminOpen(true);
                  setProfileOpen(false);
                }
                setChatSearchOpen(false);
              }}
              title={l("Профиль", "Profile")}
            >
              <Ava name={activeChatName || activeChat.name} colorIdx={activeChat.colorIdx} size="md" online={activeChat.online} avatarUrl={activeChat.avatarUrl} />
              <span className="chat-head-person-text">
                <b>{activeChatName || activeChat.name}</b>
                <small className={activeChat.online ? "" : "off"}>
                  {activeChat.type === "group"
                    ? `${activeChat.members} ${t.participants || "members"}`
                    : activeChat.online ? (t.online || "online") : (t.offline || "last seen recently")}
                </small>
              </span>
            </button>
            <div className="chat-head-right">
              {callsEnabled && activeChat.type === "direct" && !isPendingRequestChat && (
                <button
                  type="button"
                  className={`chat-head-mini-btn${Number(callChatId) === Number(activeChat.id) && callPhase !== "idle" ? " active" : ""}`}
                  title={
                    micError
                      ? l("Нет доступа к микрофону", "Microphone permission denied")
                      : Number(callChatId) === Number(activeChat.id) && callPhase !== "idle"
                        ? l("Завершить звонок", "Hang up")
                        : l("Позвонить", "Call")
                  }
                  aria-label={
                    Number(callChatId) === Number(activeChat.id) && callPhase !== "idle"
                      ? l("Завершить звонок", "Hang up")
                      : l("Позвонить", "Call")
                  }
                  disabled={callPhase !== "idle" && Number(callChatId) !== Number(activeChat.id)}
                  onClick={() => {
                    if (Number(callChatId) === Number(activeChat.id) && callPhase !== "idle") {
                      onHangup?.();
                      return;
                    }
                    onStartCall?.(activeChat);
                    setProfileOpen(false);
                    setChatSearchOpen(false);
                  }}
                >
                  {Number(callChatId) === Number(activeChat.id) && callPhase !== "idle"
                    ? <PhoneOffIcon />
                    : <PhoneIcon />}
                </button>
              )}
              {activeChat.type === "direct" && (
                <button
                  type="button"
                  className="chat-head-mini-btn"
                  title={l("Проверить шифрование", "Verify encryption")}
                  aria-label={l("Проверить шифрование", "Verify encryption")}
                  onClick={() => {
                    void openSafetyNumber();
                    setProfileOpen(false);
                    setChatSearchOpen(false);
                  }}
                >
                  <ShieldIcon />
                </button>
              )}
            </div>
          </div>

          {chatSearchOpen && (
            <ChatSearchBar
              chatSearchRef={chatSearchRef}
              messageSearch={messageSearch}
              setMessageSearch={setMessageSearch}
              matchIds={matchIds}
              matchIndex={matchIndex}
              goToMatch={goToMatch}
              resetMessageSearch={resetMessageSearch}
              l={l}
            />
          )}

          {groupAdminOpen && activeChat?.type === "group" && (
            <GroupAdminModal
              me={me}
              chat={activeChat}
              l={l}
              chatBg={chatBg}
              onChangeBg={(val) => setChatBgs(prev => ({...prev, [String(activeChat.id)]: val}))}
              onRefreshGroup={async (chatId) => {
                await chatStore.loadChats(me?.id);
                chatStore.setActiveId(chatId);
              }}
              onClose={() => setGroupAdminOpen(false)}
            />
          )}

          {profileOpen && activeChat?.type === "direct" && (
            <UserProfileModal
              me={me}
              l={l}
              chat={{ ...activeChat, name: activeChatName || activeChat.name }}
              onClose={() => setProfileOpen(false)}
              onOpenSearch={() => { setProfileOpen(false); setChatSearchOpen(true); }}
              onVerifyEncryption={() => { void openSafetyNumber(); }}
              onAliasChange={onAliasChange}
              chatBg={chatBg}
              onChangeBg={(val) => setChatBgs(prev => ({...prev, [String(chatStore.activeId)]: val}))}
              muted={chatMuted}
              onToggleMute={() => toggleMuted(me?.id, chatStore.activeId)}
            />
          )}

          <MessageList
            msgs={activeMsgs}
            me={me}
            activeChat={activeChat}
            loadingMsgs={loadingMsgs}
            onContextMenu={openCtx}
            onReact={reactToMsg}
            searchQuery={messageSearch}
            typingUsername={typingUsername}
            activeMatchId={activeMatchId}
            scrollToMessageId={scrollToMessageId}
            unreadCount={unreadCount}
            onPinChange={onPinChange}
            onReachedBottom={onReachedBottom}
            onOpenMedia={onOpenMedia}
          />

          {isRequesterInPendingChat && requesterFirstMsgSent && (
            <div className="request-wait-banner">
              {l(
                "Подождите, пока пользователь примет ваш запрос.",
                "Please wait until the user accepts your request."
              )}
            </div>
          )}

          <MessageInput
            onSend={sendMsg}
            replyTo={replyTo}
            onОтменаОтветить={() => setReplyTo(null)}
            onTyping={sendTyping}
            disabled={
              (isPendingRequestChat && !isRequesterInPendingChat) ||
              (isRequesterInPendingChat && requesterFirstMsgSent) ||
              Boolean(myGroupMuteUntilMs)
            }
            pendingFirstMessageOnly={isRequesterInPendingChat && !requesterFirstMsgSent}
            muteInlineNotice={
              myGroupMuteUntilMs
                ? l(
                    `Вы в муте в этой группе. Осталось: ${myGroupMuteCountdown || "…"}`,
                    `You are muted in this group. Time left: ${myGroupMuteCountdown || "…"}`
                  )
                : null
            }
            messagePlaceholder={messagePlaceholder}
            replyPreviewTitle={l("Ответить", "Reply")}
          />
        </>
      )}
    </section>
  );
}
