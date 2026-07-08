import { api } from "../api";

export default function GroupInviteSection({ chat, l, inviteQuery, setInviteQuery, inviteLoading, inviteResults, selectedInviteIds, setSelectedInviteIds, groupActionBusy, setGroupActionBusy, setGroupActionError, onRefreshGroup }) {
  return (
    <>
      <div className="group-admin-section-divider" role="presentation" />
      <div className="group-admin-section-label tool-note">{l("Приглашения", "Invites")}</div>
      <label className="field-label" htmlFor="ga-invite-search">
        {l("Найти по имени пользователя", "Find by username")}
      </label>
      <input id="ga-invite-search" className="field-inp" value={inviteQuery}
        onChange={(e) => setInviteQuery(e.target.value)}
        placeholder={l("Минимум 2 символа", "At least 2 characters")} autoComplete="off" />
      {inviteLoading && <div className="tool-note">{l("Поиск…", "Searching…")}</div>}
      {(inviteResults || []).slice(0, 8).map((u) => {
        const selected = selectedInviteIds.includes(u.id);
        return (
          <button key={u.id} type="button" className="tool-row"
            onClick={() => setSelectedInviteIds((prev) => (selected ? prev.filter((x) => x !== u.id) : [...prev, u.id]))}
          >
            <b>{u.firstName || u.username}</b>
            <i>{selected ? "✓" : "+"}</i>
          </button>
        );
      })}

      <div className="group-admin-section-divider group-admin-section-divider--footer" role="presentation" />
      <div className="profile-bottom-actions single group-admin-footer-actions">
        <button type="button" className="btn-pri" disabled={groupActionBusy || !selectedInviteIds.length}
          onClick={async () => {
            setGroupActionBusy(true);
            setGroupActionError("");
            try {
              await api.inviteGroupParticipants(chat.id, selectedInviteIds);
              setSelectedInviteIds([]);
              setInviteQuery("");
              await onRefreshGroup?.(chat.id);
            } catch (e) {
              setGroupActionError(e?.message || l("Не удалось пригласить участников.", "Failed to invite participants."));
            } finally {
              setGroupActionBusy(false);
            }
          }}
        >
          {l("Пригласить выбранных", "Invite selected")}
        </button>
      </div>
    </>
  );
}