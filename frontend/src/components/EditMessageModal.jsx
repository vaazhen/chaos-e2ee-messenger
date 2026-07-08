import { useRef } from "react";
import useSwipeDown from "../hooks/useSwipeDown";

export default function EditMessageModal({ editTarget, editText, editLoading, setEditText, setEditTarget, submitEdit, l }) {
  const modalRef = useRef(null);
  useSwipeDown(modalRef, () => !editLoading && setEditTarget(null), { enabled: !editLoading });

  if (!editTarget) return null;

  return (
    <div className="modal-bg" onClick={() => !editLoading && setEditTarget(null)}>
      <div ref={modalRef} className="modal small-modal glass-card" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          {l("Изменить сообщение", "Edit message")}
          <button className="modal-close" onClick={() => !editLoading && setEditTarget(null)}>×</button>
        </div>
        <textarea
          className="field-inp edit-textarea"
          value={editText}
          onChange={e => setEditText(e.target.value)}
          autoFocus rows={4}
          onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submitEdit(); }}
        />
        {editTarget._img && (
          <div className="field-hint">
            {l("Будет изменена только подпись к изображению.", "Only the image caption will be changed.")}
          </div>
        )}
        {editTarget._voice && (
          <div className="field-hint">
            {l("Будет изменена только подпись к голосовому сообщению.", "Only the voice caption will be changed.")}
          </div>
        )}
        <div className="btn-row">
          <button className="btn-sec" disabled={editLoading} onClick={() => setEditTarget(null)}>
            {l("Отмена", "Cancel")}
          </button>
          <button className="btn-pri" disabled={editLoading || !editText.trim()} onClick={submitEdit}>
            {editLoading ? l("Сохраняем...", "Saving...") : l("Сохранить", "Save")}
          </button>
        </div>
      </div>
    </div>
  );
}
