import Ava from "./Ava";

export default function RequestsTab({ l, requestItems, selectReqMode, setSelectReqMode, selectedReqIds, setSelectedReqIds, loadingRequests, onAcceptRequest, onDeclineRequest }) {
  return (
    <>
      <div className="requests-head-actions">
        <button className="mini-btn" type="button" onClick={() => setSelectReqMode(v => !v)}>
          {selectReqMode ? l("Отмена", "Cancel") : l("Выбрать", "Select")}
        </button>
        {selectReqMode && (
          <button
            className="mini-btn danger"
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

      {loadingRequests && (
        <div className="new-chat-drawer-loading">
          <div className="spinner" />
        </div>
      )}

      {!loadingRequests && requestItems.map(chat => (
        <div key={chat.id} className="new-chat-drawer-user selected">
          <Ava
            name={chat.name}
            colorIdx={chat.colorIdx}
            size="md"
            avatarUrl={chat.avatarUrl}
          />
          <span className="new-chat-drawer-user-main">
            <b>{chat.name}</b>
            <small>{chat.preview || l("Запрос на переписку", "Chat request")}</small>
          </span>
          {selectReqMode ? (
            <label className="req-select">
              <input
                type="checkbox"
                checked={selectedReqIds.includes(chat.id)}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSelectedReqIds(prev =>
                    checked ? [...new Set([...prev, chat.id])] : prev.filter(id => id !== chat.id)
                  );
                }}
              />
            </label>
          ) : (
            <div className="conversation-req-actions">
              <button className="req-btn accept" type="button" onClick={() => onAcceptRequest?.(chat.id)}>
                {l("Принять", "Accept")}
              </button>
              <button className="req-btn decline" type="button" onClick={() => onDeclineRequest?.(chat.id)}>
                {l("Отклонить", "Decline")}
              </button>
            </div>
          )}
        </div>
      ))}

      {!loadingRequests && requestItems.length === 0 && (
        <div className="product-empty mini">
          <div className="product-empty-title">{l("Нет запросов", "No requests")}</div>
          <div className="product-empty-sub">
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