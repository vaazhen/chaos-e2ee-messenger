import { api } from "../api";

export default function GroupProfileSection({ chat, l, groupName, setGroupName, groupBio, setGroupBio, groupActionBusy, setGroupActionBusy, setGroupActionError, onRefreshGroup }) {
  return (
    <>
      <div className="group-admin-section-divider" role="presentation" />
      <div className="group-admin-section-label tool-note">{l("Профиль группы", "Group profile")}</div>
      <label className="field-label" htmlFor="ga-group-name">
        {l("Название", "Name")}
      </label>
      <input id="ga-group-name" className="field-inp" value={groupName}
        onChange={(e) => setGroupName(e.target.value)} autoComplete="off" />
      <label className="field-label" htmlFor="ga-group-bio">
        {l("Описание", "Description")}
      </label>
      <input id="ga-group-bio" className="field-inp" value={groupBio}
        onChange={(e) => setGroupBio(e.target.value)} autoComplete="off" />
      <div className="profile-bottom-actions single">
        <button type="button" className="btn-sec" disabled={groupActionBusy}
          onClick={async () => {
            setGroupActionBusy(true);
            setGroupActionError("");
            try {
              await api.patchGroupSettings(chat.id, { name: groupName, bio: groupBio });
              await onRefreshGroup?.(chat.id);
            } catch (e) {
              setGroupActionError(e?.message || l("Не удалось сохранить профиль группы.", "Failed to update group profile."));
            } finally {
              setGroupActionBusy(false);
            }
          }}
        >
          {l("Сохранить профиль", "Save profile")}
        </button>
      </div>
    </>
  );
}