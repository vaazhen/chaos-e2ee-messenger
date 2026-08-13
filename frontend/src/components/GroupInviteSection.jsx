import Ava from "./Ava";
import { api } from "../api";

export default function GroupInviteSection({
  chat,
  l,
  inviteQuery,
  setInviteQuery,
  inviteLoading,
  inviteResults,
  selectedInviteIds,
  setSelectedInviteIds,
  groupActionBusy,
  setGroupActionBusy,
  setGroupActionError,
  onRefreshGroup,
}) {
  return (
    <div className="ga-pane">
      <label className="ga-field" htmlFor="ga-invite-search">
        <span>{l("Найти человека", "Find a person")}</span>
        <input
          id="ga-invite-search"
          className="settings-sheet-input"
          value={inviteQuery}
          onChange={(e) => setInviteQuery(e.target.value)}
          placeholder={l("Минимум 2 символа", "At least 2 characters")}
          autoComplete="off"
        />
      </label>
      {inviteLoading && <div className="ga-muted">{l("Поиск…", "Searching…")}</div>}
      <div className="settings-list up-info ga-invite-list">
        {(inviteResults || []).slice(0, 8).map((u) => {
          const selected = selectedInviteIds.includes(u.id);
          const name = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username;
          return (
            <button
              key={u.id}
              type="button"
              className={`up-info-row${selected ? " is-on" : ""}`}
              onClick={() => setSelectedInviteIds((prev) => (selected ? prev.filter((x) => x !== u.id) : [...prev, u.id]))}
            >
              <Ava name={name} colorIdx={Number(u.id || 0) % 7} size="sm" avatarUrl={u.avatarUrl} />
              <span className="up-info-label">{name}</span>
              <span className="up-info-value">{selected ? "✓" : "+"}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="btn-pri ga-save"
        disabled={groupActionBusy || !selectedInviteIds.length}
        onClick={async () => {
          setGroupActionBusy(true);
          setGroupActionError("");
          try {
            await api.inviteGroupParticipants(chat.id, selectedInviteIds);
            setSelectedInviteIds([]);
            setInviteQuery("");
            await onRefreshGroup?.(chat.id);
          } catch (e) {
            setGroupActionError(
              e?.message || l("Не удалось пригласить участников.", "Failed to invite participants.")
            );
          } finally {
            setGroupActionBusy(false);
          }
        }}
      >
        {l("Пригласить выбранных", "Invite selected")}
      </button>
    </div>
  );
}
