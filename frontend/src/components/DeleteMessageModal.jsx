import Modal from "./ui/Modal";
import Button from "./ui/Button";

export default function DeleteMessageModal({ deleteTarget, setDeleteTarget, confirmDelete, l }) {
  if (!deleteTarget) return null;

  return (
    <Modal open onClose={() => setDeleteTarget(null)} title={l("Удалить сообщение", "Delete message")} size="sm">
      <div className="modal-body">
        <p className="modal-copy">
          {l("Выберите способ удаления.", "Choose how to delete this message.")}
        </p>
      </div>
      <div className="modal-actions modal-actions--stack">
        <Button variant="secondary" onClick={() => confirmDelete("me")}>
          {l("Удалить у меня", "Delete for me")}
        </Button>
        {deleteTarget._out && !deleteTarget._temp && (
          <Button danger onClick={() => confirmDelete("everyone")}>
            {l("Удалить у всех", "Delete for everyone")}
          </Button>
        )}
        <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
          {l("Отмена", "Cancel")}
        </Button>
      </div>
    </Modal>
  );
}
