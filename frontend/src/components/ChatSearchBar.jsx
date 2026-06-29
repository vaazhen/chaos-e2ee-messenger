export default function ChatSearchBar({
  chatSearchRef,
  messageSearch, setMessageSearch,
  matchIds, matchIndex,
  goToMatch, resetMessageSearch,
  l,
}) {
  return (
    <div ref={chatSearchRef} className="chat-search-bar" onClick={e => e.stopPropagation()}>
      <span>⌕</span>
      <input
        value={messageSearch}
        onChange={e => setMessageSearch(e.target.value)}
        onKeyDown={(e) => {
          if (!matchIds.length) return;
          if (e.key === "ArrowUp") {
            e.preventDefault();
            goToMatch(-1);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            goToMatch(1);
          } else if (e.key === "Enter") {
            e.preventDefault();
            goToMatch(e.shiftKey ? -1 : 1);
          }
        }}
        placeholder={l("Поиск по сообщениям", "Search messages")}
        autoFocus
      />
      <b>{messageSearch.trim() ? (matchIds.length ? `${matchIndex + 1}/${matchIds.length}` : "0") : ""}</b>
      <button
        type="button"
        className="chat-search-nav"
        title={l("К предыдущему", "Previous")}
        disabled={!matchIds.length}
        onClick={() => goToMatch(-1)}
      >↑</button>
      <button
        type="button"
        className="chat-search-nav"
        title={l("К следующему", "Next")}
        disabled={!matchIds.length}
        onClick={() => goToMatch(1)}
      >↓</button>
      <button onClick={resetMessageSearch}>×</button>
    </div>
  );
}