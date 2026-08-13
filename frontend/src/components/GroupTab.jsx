import Ava from "./Ava";
import { CheckIcon } from "./Icons";

export default function GroupTab({ l, groupName, setGroupName, selected, toggleSelect }) {
  return (
    <div className="new-chat-group-fields">
      <label className="field-label" htmlFor="new-chat-group-name">{l("Название группы", "Group name")}</label>
      <input
        id="new-chat-group-name"
        className="field-inp"
        value={groupName}
        onChange={e => setGroupName(e.target.value)}
        placeholder={l("Команда, семья, проект...", "Team, family, project...")}
      />

      {selected.length > 0 && (
        <div className="new-chat-chips">
          {selected.map(u => (
            <button type="button" key={u.id} className="new-chat-chip" onClick={() => toggleSelect(u)}>
              @{u.username} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function UserSearchResults({ l, searching, mode, query, results, suggestedUsers, selected, startDirect, toggleSelect }) {
  const users = mode === "group" && query.trim().length < 2 ? suggestedUsers : results;
  const showEmptySearch = !searching && query.trim().length >= 2 && results.length === 0;
  const showEmptySuggest = !searching && mode === "group" && query.trim().length < 2 && suggestedUsers.length === 0;

  return (
    <>
      {searching && (
        <div className="new-chat-loading">
          <div className="spinner" />
        </div>
      )}

      {!searching && users.length > 0 && (
        <div className="new-chat-list">
          {mode === "group" && (
            <div className="new-chat-section-label">
              {query.trim().length < 2
                ? l("Предложения", "Suggested")
                : l("Результаты", "Results")}
            </div>
          )}
          {users.map(u => {
            const selectedUser = selected.some(s => String(s.id) === String(u.id));
            const displayName = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username;

            return (
              <button
                key={u.id || u.username}
                type="button"
                className={`new-chat-user${selectedUser ? " selected" : ""}`}
                onClick={() => mode === "direct" ? startDirect(u.username) : toggleSelect(u)}
              >
                <Ava
                  name={displayName}
                  colorIdx={Number(u.id || 0) % 7}
                  size="md"
                  avatarUrl={u.avatarUrl}
                />

                <span className="new-chat-user-main">
                  <b>{displayName}</b>
                  <small>@{u.username}</small>
                </span>

                {mode === "group" && (
                  <span className={`new-chat-pick${selectedUser ? " is-on" : ""}`} aria-hidden="true">
                    {selectedUser ? <CheckIcon /> : <span className="new-chat-pick-plus">+</span>}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {showEmptySearch && (
        <div className="new-chat-empty">
          <div className="new-chat-empty-title">{l("Ничего не найдено", "Nothing found")}</div>
          <div className="new-chat-empty-sub">
            {l("Поиск сейчас работает по username.", "Search currently works by username.")}
          </div>
        </div>
      )}
      {showEmptySuggest && (
        <div className="new-chat-empty">
          <div className="new-chat-empty-title">{l("Нет предложений", "No suggestions")}</div>
          <div className="new-chat-empty-sub">
            {l("Введите username для приглашения участников.", "Enter a username to invite members.")}
          </div>
        </div>
      )}
    </>
  );
}
