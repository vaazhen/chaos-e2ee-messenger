import Modal from "./ui/Modal";
import TextField from "./ui/TextField";
import Button from "./ui/Button";

export default function EditMessageModal({ editTarget, editText, editLoading, setEditText, setEditTarget, submitEdit, l }) {
  if (!editTarget) return null;

  const close = () => { if (!editLoading) setEditTarget(null); };

  const isCaption = Boolean(editTarget._img || editTarget._voice);

  return (
    <Modal open onClose={close} title={l("Изменить сообщение", "Edit message")} size="sm" className="edit-modal">
      <div className="modal-body">
        {editTarget._img && (
          <p className="modal-copy">
            {l("Будет изменена только подпись к изображению.", "Only the image caption will be changed.")}
          </p>
        )}
        {editTarget._voice && (
          <p className="modal-copy">
            {l("Будет изменена только подпись к голосовому сообщению.", "Only the voice caption will be changed.")}
          </p>
        )}
        <TextField
          multiline
          className="edit-textarea"
          value={editText}
          onChange={e => setEditText(e.target.value)}
          autoFocus
          rows={5}
          placeholder={isCaption ? l("Подпись", "Caption") : l("Текст сообщения", "Message text")}
          onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submitEdit(); }}
        />
      </div>
      <div className="modal-actions">
        <Button variant="secondary" disabled={editLoading} onClick={close}>
          {l("Отмена", "Cancel")}
        </Button>
        <Button disabled={editLoading || !editText.trim()} onClick={submitEdit}>
          {editLoading ? l("Сохраняем...", "Saving...") : l("Сохранить", "Save")}
        </Button>
      </div>
    </Modal>
  );
}
