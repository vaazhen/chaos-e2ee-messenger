import { api } from "../api";

export default function GroupProfileSection({
  chat,
  l,
  groupName,
  setGroupName,
  groupBio,
  setGroupBio,
  groupActionBusy,
  setGroupActionBusy,
  setGroupActionError,
  onRefreshGroup,
}) {
  return (
    <div className="ga-pane">
      <label className="ga-field" htmlFor="ga-group-name">
        <span>{l("Название", "Name")}</span>
        <input
          id="ga-group-name"
          className="settings-sheet-input"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          autoComplete="off"
        />
      </label>
      <label className="ga-field" htmlFor="ga-group-bio">
        <span>{l("Описание", "Description")}</span>
        <input
          id="ga-group-bio"
          className="settings-sheet-input"
          value={groupBio}
          onChange={(e) => setGroupBio(e.target.value)}
          autoComplete="off"
        />
      </label>
      <button
        type="button"
        className="btn-pri ga-save"
        disabled={groupActionBusy}
        onClick={async () => {
          setGroupActionBusy(true);
          setGroupActionError("");
          try {
            await api.patchGroupSettings(chat.id, { name: groupName, bio: groupBio });
            await onRefreshGroup?.(chat.id);
          } catch (e) {
            setGroupActionError(
              e?.message || l("Не удалось сохранить профиль группы.", "Failed to update group profile.")
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
