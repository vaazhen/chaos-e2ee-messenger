import { StarIcon, UsersIcon } from "./Icons";

export default function DirectTab({ l, openSaved, loading, setMode }) {
  return (
    <div className="new-chat-list">
      <button type="button" className="new-chat-action" onClick={openSaved} disabled={loading}>
        <span className="new-chat-action-icon new-chat-action-icon--saved"><StarIcon /></span>
        <span className="new-chat-action-text">
          <b>{l("Избранное", "Saved Messages")}</b>
          <small>{l("Личные зашифрованные заметки и файлы", "Personal encrypted notes and files")}</small>
        </span>
      </button>

      <button type="button" className="new-chat-action" onClick={() => setMode("group")}>
        <span className="new-chat-action-icon new-chat-action-icon--group"><UsersIcon /></span>
        <span className="new-chat-action-text">
          <b>{l("Создать группу", "Create group")}</b>
          <small>
            {l("Закрытая переписка с несколькими участниками", "Private conversation with several members")}
          </small>
        </span>
      </button>
    </div>
  );
}
