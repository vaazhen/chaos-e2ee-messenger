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
      <div
        className="user-profile-screen group-admin-modal-screen"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-admin-modal-title"
      >
        <div className="sheet-head sheet-head--center-title">
          <div id="group-admin-modal-title" className="sheet-title">
            {l("Управление группой", "Group management")}
          </div>
        </div>
        <div className="user-profile-content scroll chat-tools-panel group-admin-modal-body">
          <GroupAdminPanel me={me} chat={chat} l={l} hidePanelTitle onRefreshGroup={onRefreshGroup} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
