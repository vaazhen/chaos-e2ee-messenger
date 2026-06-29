import Ava from "./Ava";

export default function GroupTab({ l, groupName, setGroupName, selected, toggleSelect }) {
  return (
    <div className="new-chat-drawer-group-card">
      <label className="field-label">{l("Название группы", "Group name")}</label>
      <input
        className="field-inp"
        value={groupName}
        onChange={e => setGroupName(e.target.value)}
        placeholder={l("Команда, семья, проект...", "Team, family, project...")}
      />

      {selected.length > 0 && (
        <div className="selected-users">
          {selected.map(u => (
            <button type="button" key={u.id} onClick={() => toggleSelect(u)}>
              @{u.username} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function UserSearchResults({ l, searching, mode, query, results, suggestedUsers, selected, startDirect, toggleSelect }) {
  return (
    <>
      {searching && (
        <div className="new-chat-drawer-loading">
          <div className="spinner" />
        </div>
      )}

      {!searching && (mode === "group" && query.trim().length < 2 ? suggestedUsers : results).map(u => {
        const selectedUser = selected.some(s => String(s.id) === String(u.id));
        const displayName = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username;

        return (
          <button
            key={u.id || u.username}
            type="button"
            className={`new-chat-drawer-user${selectedUser ? " selected" : ""}`}
            onClick={() => mode === "direct" ? startDirect(u.username) : toggleSelect(u)}
          >
            <Ava
              name={displayName}
              colorIdx={Number(u.id || 0) % 7}
              size="md"
              avatarUrl={u.avatarUrl}
            />

            <span className="new-chat-drawer-user-main">
              <b>{displayName}</b>
              <small>@{u.username}</small>
            </span>

            <i>{mode === "group" ? (selectedUser ? "✓" : "+") : "›"}</i>
          </button>
        );
      })}

      {!searching && query.trim().length >= 2 && results.length === 0 && (
        <div className="product-empty mini">
          <div className="product-empty-title">{l("Ничего не найдено", "Nothing found")}</div>
          <div className="product-empty-sub">
            {l("Поиск сейчас работает по username.", "Search currently works by username.")}
          </div>
        </div>
      )}
      {!searching && mode === "group" && query.trim().length < 2 && suggestedUsers.length === 0 && (
        <div className="product-empty mini">
          <div className="product-empty-title">{l("Нет предложений", "No suggestions")}</div>
          <div className="product-empty-sub">
            {l("Введите username для приглашения участников.", "Enter a username to invite members.")}
          </div>
        </div>
      )}
    </>
  );
}