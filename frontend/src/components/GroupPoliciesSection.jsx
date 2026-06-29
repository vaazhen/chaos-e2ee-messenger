import { api } from "../api";

export default function GroupPoliciesSection({ chat, l, whoCanWrite, setWhoCanWrite, whoCanEditInfo, setWhoCanEditInfo, whoCanInvite, setWhoCanInvite, groupActionBusy, setGroupActionBusy, setGroupActionError, onRefreshGroup }) {
  return (
    <>
      <div className="group-admin-section-divider" role="presentation" />
      <div className="group-admin-section-label tool-note">
        {l("Политики группы (только владелец)", "Group policies (owner only)")}
      </div>
      <label className="field-label" htmlFor="ga-who-write">
        {l("Кто может писать", "Who can send messages")}
      </label>
      <p className="tool-note group-policy-hint">{l("Кто может писать сообщения. Более строгие значения ограничивают отправку для обычных участников.", "Who can send messages. Stricter values restrict posting for lower roles.")}</p>
      <select id="ga-who-write" className="field-inp" value={whoCanWrite} onChange={(e) => setWhoCanWrite(e.target.value)}>
        <option value="ALL">{l("Все участники", "All participants")}</option>
        <option value="MODERATORS">{l("Модератор и выше", "Moderators and above")}</option>
        <option value="ADMINS">{l("Админ и выше", "Admins and above")}</option>
        <option value="OWNER">{l("Только владелец", "Owner only")}</option>
      </select>

      <label className="field-label" htmlFor="ga-who-edit">
        {l("Кто может менять информацию о группе", "Who can edit group info")}
      </label>
      <p className="tool-note group-policy-hint">{l("Кто может менять название и описание группы. Не путать с правами модерации участников.", "Who can edit the group name and description. Separate from participant moderation.")}</p>
      <select id="ga-who-edit" className="field-inp" value={whoCanEditInfo} onChange={(e) => setWhoCanEditInfo(e.target.value)}>
        <option value="ANYONE">{l("Любой участник", "Any participant")}</option>
        <option value="MODERATORS">{l("Модератор и выше", "Moderators and above")}</option>
        <option value="ADMINS">{l("Админ и выше", "Admins and above")}</option>
        <option value="OWNER">{l("Только владелец", "Owner only")}</option>
      </select>

      <label className="field-label" htmlFor="ga-who-invite">
        {l("Кто может приглашать", "Who can invite")}
      </label>
      <p className="tool-note group-policy-hint">{l("Кто может приглашать новых людей в группу (если политика позволяет вашей роли).", "Who may invite new people (your role must also satisfy this policy).")}</p>
      <select id="ga-who-invite" className="field-inp" value={whoCanInvite} onChange={(e) => setWhoCanInvite(e.target.value)}>
        <option value="ANYONE">{l("Любой участник", "Any participant")}</option>
        <option value="MODERATORS">{l("Модератор и выше", "Moderators and above")}</option>
        <option value="ADMINS">{l("Админ и выше", "Admins and above")}</option>
        <option value="OWNER">{l("Только владелец", "Owner only")}</option>
      </select>
      <div className="profile-bottom-actions single">
        <button type="button" className="btn-sec" disabled={groupActionBusy}
          onClick={async () => {
            setGroupActionBusy(true);
            setGroupActionError("");
            try {
              await api.patchGroupPermissions(chat.id, { whoCanWrite, whoCanEditInfo, whoCanInvite });
              await onRefreshGroup?.(chat.id);
            } catch (e) {
              setGroupActionError(e?.message || l("Не удалось сохранить политики группы.", "Failed to update group policies."));
            } finally {
              setGroupActionBusy(false);
            }
          }}
        >
          {l("Сохранить политики", "Save policies")}
        </button>
      </div>
    </>
  );
}