import { useEffect, useState } from "react";
import { api } from "../api";
import { canFullAdmin, normalizedRole } from "../utils/groupRbac";
import ParticipantSection from "./ParticipantSection";
import GroupProfileSection from "./GroupProfileSection";
import GroupPoliciesSection from "./GroupPoliciesSection";
import GroupInviteSection from "./GroupInviteSection";

export default function GroupAdminPanel({ me, chat, l, onRefreshGroup, onClose, hidePanelTitle }) {
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResults, setInviteResults] = useState([]);
  const [selectedInviteIds, setSelectedInviteIds] = useState([]);
  const [groupActionError, setGroupActionError] = useState("");
  const [groupActionBusy, setGroupActionBusy] = useState(false);
  const [groupName, setGroupName] = useState(chat?.name || "");
  const [groupBio, setGroupBio] = useState(chat?.groupBio || "");
  const [whoCanWrite, setWhoCanWrite] = useState(chat?.whoCanWrite || "ALL");
  const [whoCanEditInfo, setWhoCanEditInfo] = useState(chat?.whoCanEditInfo || "ADMINS");
  const [whoCanInvite, setWhoCanInvite] = useState(chat?.whoCanInvite || "ADMINS");

  const actorRole = normalizedRole(chat?.myRole);
  const fullAdmin = canFullAdmin(actorRole);
  const canChangePermissions = actorRole === "OWNER";
  const canArchiveGroup = actorRole === "OWNER";

  useEffect(() => {
    if (!fullAdmin || inviteQuery.trim().length < 2) {
      setInviteResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setInviteLoading(true);
      try {
        const users = await api.searchUsers(inviteQuery.trim());
        if (cancelled) return;
        const members = new Set((chat.groupParticipants || []).map((p) => String(p.userId)));
        const filtered = (Array.isArray(users) ? users : []).filter(
          (u) => String(u.id) !== String(me?.id) && !members.has(String(u.id))
        );
        setInviteResults(filtered);
      } catch (e) {
        if (!cancelled) {
          setGroupActionError(
            e?.message || l("Не удалось выполнить поиск для приглашения.", "Invite search failed.")
          );
        }
      } finally {
        if (!cancelled) setInviteLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fullAdmin, inviteQuery, chat?.groupParticipants, me?.id, l]);

  useEffect(() => {
    setGroupName(chat?.name || "");
    setGroupBio(chat?.groupBio || "");
    setWhoCanWrite(chat?.whoCanWrite || "ALL");
    setWhoCanEditInfo(chat?.whoCanEditInfo || "ADMINS");
    setWhoCanInvite(chat?.whoCanInvite || "ADMINS");
  }, [chat?.id, chat?.name, chat?.groupBio, chat?.whoCanWrite, chat?.whoCanEditInfo, chat?.whoCanInvite]);

  const confirmDestructive = (message) => {
    if (typeof window === "undefined") return true;
    return window.confirm(message);
  };

  return (
    <div className="tool-card group-admin-card">
      {!hidePanelTitle && (
        <div className="tool-title">{l("Управление группой", "Group management")}</div>
      )}
      {chat.myRole && (
        <div className="tool-note group-admin-role-line">
          {l("Ваша роль", "Your role")}: <strong>{String(chat.myRole).toUpperCase()}</strong>
        </div>
      )}
      {groupActionError && <div className="profile-error">{groupActionError}</div>}

      <div className="group-admin-unified-card">

      <ParticipantSection me={me} chat={chat} l={l} onRefreshGroup={onRefreshGroup} />

      {fullAdmin && <GroupProfileSection chat={chat} l={l} groupName={groupName} setGroupName={setGroupName} groupBio={groupBio} setGroupBio={setGroupBio} groupActionBusy={groupActionBusy} setGroupActionBusy={setGroupActionBusy} setGroupActionError={setGroupActionError} onRefreshGroup={onRefreshGroup} />}

      {canChangePermissions && <GroupPoliciesSection chat={chat} l={l} whoCanWrite={whoCanWrite} setWhoCanWrite={setWhoCanWrite} whoCanEditInfo={whoCanEditInfo} setWhoCanEditInfo={setWhoCanEditInfo} whoCanInvite={whoCanInvite} setWhoCanInvite={setWhoCanInvite} groupActionBusy={groupActionBusy} setGroupActionBusy={setGroupActionBusy} setGroupActionError={setGroupActionError} onRefreshGroup={onRefreshGroup} />}

      {fullAdmin && <GroupInviteSection chat={chat} l={l} inviteQuery={inviteQuery} setInviteQuery={setInviteQuery} inviteLoading={inviteLoading} inviteResults={inviteResults} selectedInviteIds={selectedInviteIds} setSelectedInviteIds={setSelectedInviteIds} groupActionBusy={groupActionBusy} setGroupActionBusy={setGroupActionBusy} setGroupActionError={setGroupActionError} onRefreshGroup={onRefreshGroup} />}
        {canArchiveGroup && (
          <button
            type="button"
            className="btn-sec"
            disabled={groupActionBusy}
            onClick={async () => {
              if (
                !confirmDestructive(
                  l(
                    "Удалить группу для всех? Только владелец может это сделать.",
                    "Delete the group for everyone? Only the owner can do this."
                  )
                )
              ) {
                return;
              }
              setGroupActionBusy(true);
              setGroupActionError("");
              try {
                await api.deleteGroup(chat.id);
                onClose?.();
                await onRefreshGroup?.(chat.id);
              } catch (e) {
                setGroupActionError(
                  e?.message || l("Не удалось удалить группу.", "Failed to delete the group.")
                );
              } finally {
                setGroupActionBusy(false);
              }
            }}
          >
            {l("Удалить группу", "Delete group")}
          </button>
        )}
      </div>
    </div>
  );
}
