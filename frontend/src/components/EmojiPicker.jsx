const EMOJI_CATEGORIES = [
  { key: "recent", icon: "🕘", label: "Recent", emojis: [] },
  { key: "smileys", icon: "😊", label: "Smileys", emojis: ["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","😉","😍","🥰","😘","😋","😎","🤩","🥳","😌","🤔","😴","😭","😡"] },
  { key: "gestures", icon: "👍", label: "Gestures", emojis: ["👍","👎","👏","🙌","🤝","👋","🤙","✌️","🤞","💪","🦾","☝️","👆","👇","👈","👉","👌","🙏"] },
  { key: "hearts", icon: "❤️", label: "Hearts", emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","❣️","💕","💞","💓","💗","💖","💘","💝"] },
  { key: "party", icon: "🎉", label: "Celebration", emojis: ["🎉","🎊","🎈","🎁","🏆","🥇","🎯","⭐","💫","✨","💥","🔥","🌟","🚀"] },
];

export default function EmojiPicker({ emojiClosing, emojiCategories, emojiCat, setEmojiCat, currentEmojis, recentEmojis, setRecentEmojis, onPick, onClose: _onClose, saveRecentEmojis }) {
  const currentCategory = emojiCategories.find(c => c.key === emojiCat) || emojiCategories[1] || emojiCategories[0];
  const displayEmojis = currentEmojis?.length ? currentEmojis : (emojiCat === "recent" ? EMOJI_CATEGORIES[1].emojis : []);

  return (
    <div className={`emoji-picker${emojiClosing ? " closing" : ""}`} onClick={e => e.stopPropagation()}>
      <div className="emoji-cats">
        {emojiCategories.map((cat) => (
          <button
            key={cat.key}
            className={`emoji-cat-btn${emojiCat === cat.key ? " active" : ""}`}
            onClick={() => setEmojiCat(cat.key)}
            title={cat.label}
          >
            <span>{cat.icon}</span>
          </button>
        ))}
      </div>
      <div className="emoji-section-head">
        <span>{currentCategory?.label || "Smileys"}</span>
        {emojiCat === "recent" && recentEmojis.length > 0 && (
          <button
            type="button"
            className="emoji-clear-btn"
            onClick={() => {
              setRecentEmojis([]);
              saveRecentEmojis([]);
            }}
          >
            Clear
          </button>
        )}
      </div>
      <div className="emoji-grid">
        {displayEmojis.map((em) => (
          <button key={`${emojiCat}-${em}`} className="emoji-btn" onClick={() => onPick(em)}>{em}</button>
        ))}
        {emojiCat === "recent" && recentEmojis.length === 0 && (
          <div className="emoji-empty">
            Recently used emoji will appear here.
          </div>
        )}
      </div>
    </div>
  );
}

export { EMOJI_CATEGORIES };

export const EMOJI_STORAGE_KEY = "cm_recent_emojis";
export const MAX_RECENT_EMOJIS = 16;

export function loadRecentEmojis() {
  try {
    const raw = localStorage.getItem(EMOJI_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function saveRecentEmojis(list) {
  try {
    localStorage.setItem(EMOJI_STORAGE_KEY, JSON.stringify(list.slice(0, MAX_RECENT_EMOJIS)));
  } catch {
  }
}