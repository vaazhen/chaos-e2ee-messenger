export default function DeleteMessageModal({ deleteTarget, setDeleteTarget, confirmDelete, l }) {
  if (!deleteTarget) return null;

  return (
    <div className="modal-bg" onClick={() => setDeleteTarget(null)}>
      <div className="modal small-modal glass-card" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          {l("Удалить сообщение", "Delete message")}
          <button className="modal-close" onClick={() => setDeleteTarget(null)}>×</button>
        </div>
        <div className="confirm-text">
          {l("Выберите способ удаления.", "Choose how to delete this message.")}
        </div>
        <div className="delete-actions">
          <button className="btn-sec" onClick={() => confirmDelete("me")}>
            {l("Удалить у меня", "Delete for me")}
          </button>
          {deleteTarget._out && !deleteTarget._temp && (
            <button className="btn-pri danger-pri" onClick={() => confirmDelete("everyone")}>
              {l("Удалить у всех", "Delete for everyone")}
            </button>
          )}
          <button className="btn-sec" onClick={() => setDeleteTarget(null)}>
            {l("Отмена", "Cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}