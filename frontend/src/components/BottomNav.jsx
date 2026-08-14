import Ava from "./Ava";
import { ChatIcon, PhoneIcon } from "./Icons";

export default function BottomNav({
  me,
  myName,
  activeTab,
  onNavChange,
  unreadTotal,
  l = (ru) => ru,
  callsEnabled = false,
}) {
  return (
    <nav className="bottom-nav">
      <button className={`bottom-nav-item${activeTab === "chats" ? " active" : ""}`} onClick={() => onNavChange("chats")}>
        <ChatIcon />
        {unreadTotal > 0 && <span className="bottom-nav-badge">{unreadTotal > 99 ? "99+" : unreadTotal}</span>}
        {l("Чаты", "Chats")}
      </button>
      {callsEnabled && (
        <button
          className={`bottom-nav-item${activeTab === "calls" ? " active" : ""}`}
          onClick={() => onNavChange("calls")}
          title={l("Звонки", "Calls")}
        >
          <PhoneIcon />
          {l("Звонки", "Calls")}
        </button>
      )}
      <button className={`bottom-nav-item${activeTab === "settings" ? " active" : ""}`} onClick={() => onNavChange("settings")} title={l("Настройки", "Settings")}>
        <Ava user={me} name={myName} size="xs" />
        {l("Настройки", "Settings")}
      </button>
    </nav>
  );
}
