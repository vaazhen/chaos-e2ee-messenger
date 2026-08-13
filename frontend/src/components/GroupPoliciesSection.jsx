import { api } from "../api";

function PolicyField({ id, label, value, onChange, l }) {
  return (
    <label className="ga-field" htmlFor={id}>
      <span>{label}</span>
      <select id={id} className="settings-sheet-input ga-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {id === "ga-who-write" ? (
          <>
            <option value="ALL">{l("Все участники", "All participants")}</option>
            <option value="MODERATORS">{l("Модератор и выше", "Moderators and above")}</option>
            <option value="ADMINS">{l("Админ и выше", "Admins and above")}</option>
            <option value="OWNER">{l("Только владелец", "Owner only")}</option>
          </>
        ) : (
          <>
            <option value="ANYONE">{l("Любой участник", "Any participant")}</option>
            <option value="MODERATORS">{l("Модератор и выше", "Moderators and above")}</option>
            <option value="ADMINS">{l("Админ и выше", "Admins and above")}</option>
            <option value="OWNER">{l("Только владелец", "Owner only")}</option>
          </>
        )}
      </select>
    </label>
  );
}

export default function GroupPoliciesSection({
  chat,
  l,
  whoCanWrite,
  setWhoCanWrite,
  whoCanEditInfo,
  setWhoCanEditInfo,
  whoCanInvite,
  setWhoCanInvite,
  groupActionBusy,
  setGroupActionBusy,
  setGroupActionError,
  onRefreshGroup,
}) {
  return (
    <div className="ga-pane">
      <PolicyField
        id="ga-who-write"
        label={l("Кто может писать", "Who can send messages")}
        value={whoCanWrite}
        onChange={setWhoCanWrite}
        l={l}
      />
      <PolicyField
        id="ga-who-edit"
        label={l("Кто может менять информацию", "Who can edit group info")}
        value={whoCanEditInfo}
        onChange={setWhoCanEditInfo}
        l={l}
      />
      <PolicyField
        id="ga-who-invite"
        label={l("Кто может приглашать", "Who can invite")}
        value={whoCanInvite}
        onChange={setWhoCanInvite}
        l={l}
      />
      <button
        type="button"
        className="btn-pri ga-save"
        disabled={groupActionBusy}
        onClick={async () => {
          setGroupActionBusy(true);
          setGroupActionError("");
          try {
            await api.patchGroupPermissions(chat.id, { whoCanWrite, whoCanEditInfo, whoCanInvite });
            await onRefreshGroup?.(chat.id);
          } catch (e) {
            setGroupActionError(
              e?.message || l("Не удалось сохранить политики группы.", "Failed to update group policies.")
            );
          } finally {
            setGroupActionBusy(false);
          }
        }}
      >
        {l("Сохранить", "Save")}
      </button>
    </div>
  );
}
