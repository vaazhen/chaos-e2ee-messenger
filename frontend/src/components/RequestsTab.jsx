import Ava from "./Ava";

export default function RequestsTab({
  l,
  requestItems,
  selectReqMode,
  setSelectReqMode,
  selectedReqIds,
  setSelectedReqIds,
  loadingRequests,
  onAcceptRequest,
  onDeclineRequest,
}) {
  return (
    <>
      {requestItems.length > 0 && (
        <div className="new-chat-req-bar">
          <button className="new-chat-text-btn" type="button" onClick={() => setSelectReqMode(v => !v)}>
            {selectReqMode ? l("Готово", "Done") : l("Выбрать", "Select")}
          </button>
          {selectReqMode && (
            <button
              className="new-chat-text-btn is-danger"
              type="button"
              disabled={!selectedReqIds.length}
              onClick={async () => {
                for (const id of selectedReqIds) {
                  await onDeclineRequest?.(id);
                }
                setSelectedReqIds([]);
                setSelectReqMode(false);
              }}
            >
              {l("Удалить выбранные", "Delete selected")}
            </button>
          )}
        </div>
      )}

      {loadingRequests && (
        <div className="new-chat-loading">
          <div className="spinner" />
        </div>
      )}

      {!loadingRequests && requestItems.length > 0 && (
        <div className="new-chat-list">
          {requestItems.map(chat => {
            const checked = selectedReqIds.includes(chat.id);
            return (
              <div
                key={chat.id}
                className={`new-chat-user new-chat-req${selectReqMode && checked ? " selected" : ""}`}
              >
                {selectReqMode && (
                  <label className="new-chat-req-check">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const on = e.target.checked;
                        setSelectedReqIds(prev =>
                          on ? [...new Set([...prev, chat.id])] : prev.filter(id => id !== chat.id)
                        );
                      }}
                    />
                  </label>
                )}
                <Ava
                  name={chat.name}
                  colorIdx={chat.colorIdx}
                  size="md"
                  avatarUrl={chat.avatarUrl}
                />
                <span className="new-chat-user-main">
                  <b>{chat.name}</b>
                  <small>{chat.preview || l("Запрос на переписку", "Chat request")}</small>
                </span>
                {!selectReqMode && (
                  <div className="new-chat-req-actions">
                    <button className="req-btn accept" type="button" onClick={() => onAcceptRequest?.(chat.id)}>
                      {l("Принять", "Accept")}
                    </button>
                    <button className="req-btn decline" type="button" onClick={() => onDeclineRequest?.(chat.id)}>
                      {l("Отклонить", "Decline")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loadingRequests && requestItems.length === 0 && (
        <div className="new-chat-empty">
          <div className="new-chat-empty-title">{l("Нет запросов", "No requests")}</div>
          <div className="new-chat-empty-sub">
            {l(
              "Новые обращения на переписку появятся здесь.",
              "New chat requests will appear here."
            )}
          </div>
        </div>
      )}
    </>
  );
}
