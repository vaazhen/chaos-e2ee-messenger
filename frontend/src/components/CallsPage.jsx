import Ava from "./Ava";
import BottomNav from "./BottomNav";
import { PhoneIcon } from "./Icons";

function formatCallTime(at) {
  if (!at) return "";
  try {
    return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function CallsPage({
  me,
  myName,
  l,
  chats = [],
  recents = [],
  unreadTotal = 0,
  onNavChange,
  onStartCall,
  callsEnabled = false,
}) {
  const recentChats = recents
    .map((item) => {
      const chat = chats.find((entry) => Number(entry.id) === Number(item.chatId));
      return {
        ...item,
        chat,
        name: chat?.name || item.name || l("Пользователь", "User"),
      };
    })
    .filter((item) => item.chat);

  const recentIds = new Set(recentChats.map((item) => Number(item.chatId)));
  const contacts = chats.filter((chat) => chat.type === "direct" && !recentIds.has(Number(chat.id)));
  const empty = recentChats.length === 0 && contacts.length === 0;

  return (
    <div className="settings-shell">
      <header className="sidebar-header">
        <h1 className="sidebar-title sidebar-title--center">{l("Звонки", "Calls")}</h1>
      </header>
      <div className="settings-scroll">
        {empty ? (
          <div className="product-empty">
            <div className="product-empty-icon" aria-hidden="true" />
            <div className="product-empty-title">{l("Пока нет звонков", "No calls yet")}</div>
            <div className="product-empty-sub">
              {l("Позвоните из личной переписки.", "Start a call from a direct chat.")}
            </div>
          </div>
        ) : (
          <>
            {recentChats.length > 0 && (
              <section className="calls-section">
                <div className="settings-section-title">{l("Недавние", "Recent")}</div>
                <div className="calls-list">
                  {recentChats.map((item) => (
                    <button
                      key={`recent-${item.chatId}`}
                      type="button"
                      className="calls-row"
                      onClick={() => onStartCall?.(item.chat)}
                    >
                      <Ava name={item.name} colorIdx={item.chat.colorIdx} avatarUrl={item.chat.avatarUrl} size="md" />
                      <span className="calls-row-main">
                        <span className="calls-row-title">{item.name}</span>
                        <small className={item.missed ? "is-missed" : ""}>
                          {item.missed
                            ? (item.direction === "in" ? l("Пропущенный", "Missed") : l("Не дозвонились", "Cancelled"))
                            : (item.direction === "in" ? l("Входящий", "Incoming") : l("Исходящий", "Outgoing"))}
                          {item.at ? ` · ${formatCallTime(item.at)}` : ""}
                        </small>
                      </span>
                      <span className="calls-row-action"><PhoneIcon /></span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            {contacts.length > 0 && (
              <section className="calls-section">
                <div className="settings-section-title">{l("Контакты", "Contacts")}</div>
                <div className="calls-list">
                  {contacts.map((chat) => (
                    <button
                      key={chat.id}
                      type="button"
                      className="calls-row"
                      onClick={() => onStartCall?.(chat)}
                    >
                      <Ava name={chat.name} colorIdx={chat.colorIdx} avatarUrl={chat.avatarUrl} size="md" online={chat.online} />
                      <span className="calls-row-main">
                        <span className="calls-row-title">{chat.name}</span>
                        <small>{chat.online ? l("в сети", "online") : (chat.username ? `@${chat.username}` : l("личный чат", "direct chat"))}</small>
                      </span>
                      <span className="calls-row-action"><PhoneIcon /></span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
        <div className="settings-bottom-spacer" />
      </div>
      <BottomNav
        me={me}
        myName={myName}
        activeTab="calls"
        onNavChange={onNavChange}
        unreadTotal={unreadTotal}
        l={l}
        callsEnabled={callsEnabled}
      />
    </div>
  );
}
