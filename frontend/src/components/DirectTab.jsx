export default function DirectTab({ l, openSaved, loading, setMode }) {
  return (
    <>
      <button type="button" className="new-chat-drawer-action" onClick={openSaved} disabled={loading}>
        <span className="new-chat-drawer-action-icon">★</span>
        <span className="new-chat-drawer-action-text">
          <b>{l("Избранное", "Saved Messages")}</b>
          <small>{l("Личные зашифрованные заметки и файлы", "Personal encrypted notes and files")}</small>
        </span>
        <i>›</i>
      </button>

      <button type="button" className="new-chat-drawer-action" onClick={() => setMode("group")}>
        <span className="new-chat-drawer-action-icon">♙</span>
        <span className="new-chat-drawer-action-text">
          <b>{l("Создать группу", "Create group")}</b>
          <small>
            {l("Закрытая переписка с несколькими участниками", "Private conversation with several members")}
          </small>
        </span>
        <i>›</i>
      </button>
    </>
  );
}