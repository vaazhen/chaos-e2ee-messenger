import { useEffect, useState } from "react";
import Ava from "./Ava";
import { api } from "../api";
import { canFullAdmin, normalizedRole } from "../utils/groupRbac";
import ParticipantSection from "./ParticipantSection";
import GroupProfileSection from "./GroupProfileSection";
import GroupPoliciesSection from "./GroupPoliciesSection";
import GroupInviteSection from "./GroupInviteSection";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "./Icons";

function rolePhrase(role, l) {
  const value = normalizedRole(role);
  if (value === "OWNER") return l("вы владелец", "you're the owner");
  if (value === "ADMIN") return l("вы админ", "you're an admin");
  if (value === "MODERATOR") return l("вы модератор", "you're a moderator");
  return l("вы участник", "you're a member");
}

function writePolicyShort(who, l) {
  if (who === "OWNER") return l("Только владелец", "Owner only");
  if (who === "ADMINS") return l("Админы", "Admins");
  if (who === "MODERATORS") return l("Модераторы", "Moderators");
  return l("Все", "Everyone");
}

function NavRow({ label, value, onClick }) {
  return (
    <button type="button" className="up-info-row" onClick={onClick} aria-label={label}>
      <span className="up-info-label">{label}</span>
      {value ? <span className="up-info-value">{value}</span> : null}
      <ChevronRightIcon />
    </button>
  );
}

const BACKGROUNDS = [
  { key: "clean", label: ["Чистый", "Clean"] },
  { key: "grid", label: ["Сетка", "Grid"] },
  { key: "noise", label: ["Шум", "Noise"] },
  { key: "gradient", label: ["Градиент", "Gradient"] },
  { key: "dots", label: ["Точки", "Dots"] },
  { key: "waves", label: ["Волны", "Waves"] },
];

function bgLabel(key, l) {
  const item = BACKGROUNDS.find((bg) => bg.key === key) || BACKGROUNDS[0];
  return l(item.label[0], item.label[1]);
}

const VIEW_TITLE = {
  members: ["Участники", "Members"],
  profile: ["Профиль группы", "Group profile"],
  policies: ["Политики", "Permissions"],
  invite: ["Пригласить", "Add members"],
  bg: ["Фон переписки", "Chat background"],
};

export default function GroupAdminPanel({ me, chat, l, onRefreshGroup, onClose, hidePanelTitle, chatBg, onChangeBg }) {
  const [view, setView] = useState("main");
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
  const memberCount = Array.isArray(chat?.groupParticipants) ? chat.groupParticipants.length : (chat?.members || 0);

  useEffect(() => {
    setView("main");
  }, [chat?.id]);

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

  const subTitle = VIEW_TITLE[view] ? l(VIEW_TITLE[view][0], VIEW_TITLE[view][1]) : "";

  return (
    <div className="tool-card group-admin-card">
      {onClose && (
        <button type="button" className="modal-close up-close" onClick={onClose} aria-label="Close" title="Закрыть">
          <CloseIcon />
        </button>
      )}
      {!hidePanelTitle && view === "main" && (
        <div className="tool-title">{l("Управление группой", "Group management")}</div>
      )}

      {view !== "main" && (
        <div className="up-subhead">
          <button type="button" className="up-back" onClick={() => setView("main")} aria-label={l("Назад", "Back")}>
            <ChevronLeftIcon />
          </button>
          <b>{subTitle}</b>
        </div>
      )}

      <div className="ga-body">
        {groupActionError && <div className="profile-error">{groupActionError}</div>}

        {view === "main" && (
          <>
            <div className="ga-hero">
              <Ava name={chat.name} colorIdx={chat.colorIdx} size="lg" avatarUrl={chat.avatarUrl} />
              <b className="ga-hero-name">{chat.name}</b>
              <span className="ga-hero-meta">
                {memberCount} {l("участников", "members")}
                {chat.myRole ? ` · ${rolePhrase(chat.myRole, l)}` : ""}
              </span>
            </div>

            <div className="settings-list up-info">
              <NavRow
                label={l("Участники", "Members")}
                value={String(memberCount)}
                onClick={() => setView("members")}
              />
              {fullAdmin && (
                <NavRow
                  label={l("Профиль группы", "Group profile")}
                  value={groupName}
                  onClick={() => setView("profile")}
                />
              )}
              {canChangePermissions && (
                <NavRow
                  label={l("Политики", "Permissions")}
                  value={writePolicyShort(whoCanWrite, l)}
                  onClick={() => setView("policies")}
                />
              )}
              {fullAdmin && (
                <NavRow
                  label={l("Пригласить", "Add members")}
                  onClick={() => setView("invite")}
                />
              )}
            </div>

            <div className="settings-section-title ga-settings-label">{l("Настройки", "Settings")}</div>
            <div className="settings-list up-info">
              <NavRow
                label={l("Фон переписки", "Chat background")}
                value={bgLabel(chatBg, l)}
                onClick={() => setView("bg")}
              />
            </div>

            {canArchiveGroup && (
              <button
                type="button"
                className="ga-danger"
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
          </>
        )}

        {view === "members" && (
          <ParticipantSection me={me} chat={chat} l={l} onRefreshGroup={onRefreshGroup} hideTitle />
        )}

        {view === "profile" && (
          <GroupProfileSection
            chat={chat}
            l={l}
            groupName={groupName}
            setGroupName={setGroupName}
            groupBio={groupBio}
            setGroupBio={setGroupBio}
            groupActionBusy={groupActionBusy}
            setGroupActionBusy={setGroupActionBusy}
            setGroupActionError={setGroupActionError}
            onRefreshGroup={onRefreshGroup}
          />
        )}

        {view === "policies" && (
          <GroupPoliciesSection
            chat={chat}
            l={l}
            whoCanWrite={whoCanWrite}
            setWhoCanWrite={setWhoCanWrite}
            whoCanEditInfo={whoCanEditInfo}
            setWhoCanEditInfo={setWhoCanEditInfo}
            whoCanInvite={whoCanInvite}
            setWhoCanInvite={setWhoCanInvite}
            groupActionBusy={groupActionBusy}
            setGroupActionBusy={setGroupActionBusy}
            setGroupActionError={setGroupActionError}
            onRefreshGroup={onRefreshGroup}
          />
        )}

        {view === "invite" && (
          <GroupInviteSection
            chat={chat}
            l={l}
            inviteQuery={inviteQuery}
            setInviteQuery={setInviteQuery}
            inviteLoading={inviteLoading}
            inviteResults={inviteResults}
            selectedInviteIds={selectedInviteIds}
            setSelectedInviteIds={setSelectedInviteIds}
            groupActionBusy={groupActionBusy}
            setGroupActionBusy={setGroupActionBusy}
            setGroupActionError={setGroupActionError}
            onRefreshGroup={onRefreshGroup}
          />
        )}

        {view === "bg" && (
          <div className="ga-pane">
            <div className="up-bg-picker bg-picker">
              {BACKGROUNDS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`bg-option bg-${item.key}${chatBg === item.key ? " active" : ""}`}
                  onClick={() => onChangeBg?.(item.key)}
                >
                  <span />
                  <b>{l(item.label[0], item.label[1])}</b>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
