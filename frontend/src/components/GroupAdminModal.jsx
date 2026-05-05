import { useEffect } from "react";
import GroupAdminPanel from "./GroupAdminPanel";

/**
 * Floating centered card for group administration (matches {@link UserProfileModal} shell).
 */
export default function GroupAdminModal({ me, chat, l, onRefreshGroup, onClose }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!chat) return null;

  return (
    <div className="modal-bg user-profile-modal-bg" onClick={onClose} role="presentation">
      <div className="user-profile-screen" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="group-admin-modal-title">
        <div className="sheet-head">
          <div id="group-admin-modal-title" className="sheet-title">
            {l("Управление группой", "Group management")}
          </div>
          <button type="button" className="round-action" onClick={onClose} aria-label={l("Закрыть", "Close")}>
            ×
          </button>
        </div>
        <div className="user-profile-content scroll chat-tools-panel group-admin-modal-body">
          <GroupAdminPanel me={me} chat={chat} l={l} hidePanelTitle onRefreshGroup={onRefreshGroup} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
