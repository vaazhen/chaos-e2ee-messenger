import GroupAdminPanel from "./GroupAdminPanel";
import Modal from "./ui/Modal";

export default function GroupAdminModal({ me, chat, l, onRefreshGroup, onClose, chatBg, onChangeBg }) {
  if (!chat) return null;

  return (
    <Modal
      open
      onClose={onClose}
      hideHeader
      overlayClassName="user-profile-modal-bg"
      className="group-admin-modal user-profile-screen group-admin-modal-screen"
      title={l("Управление группой", "Group management")}
    >
      <div className="modal-body scroll chat-tools-panel group-admin-modal-body">
        <GroupAdminPanel
          me={me}
          chat={chat}
          l={l}
          hidePanelTitle
          chatBg={chatBg}
          onChangeBg={onChangeBg}
          onRefreshGroup={onRefreshGroup}
          onClose={onClose}
        />
      </div>
    </Modal>
  );
}
