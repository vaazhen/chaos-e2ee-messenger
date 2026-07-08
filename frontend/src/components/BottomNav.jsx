import Ava from "./Ava";
import { PhoneIcon, UsersIcon, ChatIcon } from "./Icons";

/**
 * Apple Liquid Glass bottom navigation dock.
 * Fixed on mobile, absolute in desktop sidebar.
 * Tabs: Calls | Contacts | Chats (with unread badge) | Settings (with avatar).
 */
export default function BottomNav({ me, myName, activeTab, onNavChange, unreadTotal, requestsCount, l = (ru) => ru }) {
  return (
    <nav className="bottom-nav">
      <button className={`bottom-nav-item${activeTab === "calls" ? " active" : ""}`} onClick={() => onNavChange("calls")}>
        <PhoneIcon />{l("Звонки", "Calls")}
      </button>
      <button className={`bottom-nav-item${activeTab === "contacts" ? " active" : ""}`} onClick={() => onNavChange("contacts")}>
        <UsersIcon />{l("Контакты", "Contacts")}
      </button>
      <button className={`bottom-nav-item${activeTab === "chats" ? " active" : ""}`} onClick={() => onNavChange("chats")}>
        <ChatIcon />
        {unreadTotal > 0 && <span className="bottom-nav-badge">{unreadTotal > 99 ? "99+" : unreadTotal}</span>}
        {l("Чаты", "Chats")}
      </button>
      <button className={`bottom-nav-item${activeTab === "settings" ? " active" : ""}`} onClick={() => onNavChange("settings")} title={l("Настройки", "Settings")}>
        <Ava user={me} name={myName} size="xs" />
        {l("Настройки", "Settings")}
      </button>
    </nav>
  );
}
