import { SearchIcon, ChevronUpIcon, ChevronDownIcon, CloseIcon } from "./Icons";

export default function ChatSearchBar({
  chatSearchRef,
  messageSearch, setMessageSearch,
  matchIds, matchIndex,
  goToMatch, resetMessageSearch,
  l,
}) {
  return (
    <div ref={chatSearchRef} className="chat-search-bar" onClick={e => e.stopPropagation()}>
      <span className="search-bar-icon"><SearchIcon /></span>
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
      <span className="search-bar-count">{messageSearch.trim() ? (matchIds.length ? `${matchIndex + 1}/${matchIds.length}` : "0") : ""}</span>
      <button
        type="button"
        className="icon-btn chat-search-nav"
        title={l("К предыдущему", "Previous")}
        disabled={!matchIds.length}
        onClick={() => goToMatch(-1)}
      ><ChevronUpIcon /></button>
      <button
        type="button"
        className="icon-btn chat-search-nav"
        title={l("К следующему", "Next")}
        disabled={!matchIds.length}
        onClick={() => goToMatch(1)}
      ><ChevronDownIcon /></button>
      <button className="icon-btn" onClick={resetMessageSearch} title={l("Закрыть", "Close")}><CloseIcon /></button>
    </div>
  );
}
