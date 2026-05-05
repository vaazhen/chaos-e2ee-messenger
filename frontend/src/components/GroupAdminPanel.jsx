import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import {
  assignableRoleValues,
  canFullAdmin,
  canModerationOnly,
  eligibleParticipantForModerationAction,
  eligibleParticipantForRoleAction,
  normalizedRole,
} from "../utils/groupRbac";

const PARTICIPANT_FILTER_DEBOUNCE_MS = 150;
/** Client-side page size for the participant list (independent scroll region). */
const PARTICIPANT_PAGE_SIZE = 30;

function policyWriteHint(l) {
  return l(
    "Кто может писать сообщения. Более строгие значения ограничивают отправку для обычных участников.",
    "Who can send messages. Stricter values restrict posting for lower roles."
  );
}

function policyEditInfoHint(l) {
  return l(
    "Кто может менять название и описание группы. Не путать с правами модерации участников.",
    "Who can edit the group name and description. Separate from participant moderation."
  );
}

function policyInviteHint(l) {
  return l(
    "Кто может приглашать новых людей в группу (если политика позволяет вашей роли).",
    "Who may invite new people (your role must also satisfy this policy)."
  );
}

function participantDisplayName(p) {
  return String(p.firstName || p.username || p.userId || "").trim() || String(p.userId);
}

function buildParticipantMenuDescriptors({
  l,
  participant,
  actorRole,
  meId,
  fullAdmin,
  assignableRoles,
  run,
}) {
  const items = [];
  const canMod = eligibleParticipantForModerationAction(actorRole, participant, meId);
  const canRole = fullAdmin && eligibleParticipantForRoleAction(actorRole, participant, meId);
  const banned = Boolean(participant.banned);
  const muted = Boolean(participant.mutedUntil) && !banned;

  const push = (entry) => items.push(entry);

  if (canMod && !banned) {
    if (muted) {
      push({
        key: "unmute",
        label: l("Снять мут", "Unmute"),
        run: () => run("unmute", participant),
      });
    } else {
      push({
        key: "mute",
        label: l("Замутить…", "Mute…"),
        run: () => run("mute", participant),
      });
    }
  }

  if (canMod) {
    if (banned) {
      push({
        key: "unban",
        label: l("Разбанить", "Unban"),
        run: () => run("unban", participant),
      });
    } else {
      push({
        key: "ban",
        label: l("Забанить…", "Ban…"),
        run: () => run("ban", participant),
      });
    }
    push({
      key: "remove",
      label: l("Исключить из группы", "Remove from group"),
      danger: true,
      run: () => run("remove", participant),
    });
  }

  if (canRole && assignableRoles.length) {
    const roleItems = [];
    for (const r of assignableRoles) {
      if (normalizedRole(r) === normalizedRole(participant.role)) continue;
      roleItems.push({
        key: `role-${r}`,
        label: l(`Роль: ${r}`, `Role: ${r}`),
        run: () => run("role", participant, { role: r }),
      });
    }
    if (roleItems.length && items.length) {
      push({ key: "sep-before-roles", separator: true });
    }
    roleItems.forEach(push);
  }

  return items;
}

function ParticipantActionsMenu({ menuState, descriptors, onClose, busy }) {
  const wrapRef = useRef(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el || !menuState) return;
    const rect = el.getBoundingClientRect();
    const pad = 10;
    let left = menuState.x;
    let top = menuState.y;
    if (left + rect.width > window.innerWidth - pad) left = window.innerWidth - pad - rect.width;
    if (top + rect.height > window.innerHeight - pad) top = window.innerHeight - pad - rect.height;
    if (left < pad) left = pad;
    if (top < pad) top = pad;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [menuState, descriptors]);

  useEffect(() => {
    if (!menuState || !descriptors.length) return;
    const t = window.setTimeout(() => {
      const first = wrapRef.current?.querySelector?.("button.ctx-item");
      first?.focus?.();
    }, 0);
    return () => window.clearTimeout(t);
  }, [menuState, descriptors]);

  useEffect(() => {
    if (!menuState) return undefined;
    let remove;
    const tid = window.setTimeout(() => {
      const onDoc = (e) => {
        if (e.target.closest?.(".group-admin-ctx-menu")) return;
        if (e.target.closest?.(".group-participant-overflow-btn")) return;
        onClose();
      };
      document.addEventListener("mousedown", onDoc);
      remove = () => document.removeEventListener("mousedown", onDoc);
    }, 0);
    return () => {
      window.clearTimeout(tid);
      remove?.();
    };
  }, [menuState, onClose]);

  if (!menuState || !descriptors.length) return null;

  return createPortal(
    <div
      ref={wrapRef}
      className="ctx-menu group-admin-ctx-menu"
      role="menu"
      aria-label={menuState.ariaLabel}
      style={{ left: menuState.x, top: menuState.y }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      {descriptors.map((d) =>
        d.separator ? (
          <div key={d.key} className="menu-line" role="separator" />
        ) : (
          <button
            key={d.key}
            type="button"
            role="menuitem"
            className={`ctx-item${d.danger ? " danger" : ""}`}
            disabled={busy}
            onClick={() => void d.run()}
          >
            {d.label}
          </button>
        )
      )}
    </div>,
    document.body
  );
}

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

  const [participantFilterInput, setParticipantFilterInput] = useState("");
  const [participantFilterDebounced, setParticipantFilterDebounced] = useState("");
  const [participantRoleFilter, setParticipantRoleFilter] = useState("");
  const [participantMutedOnly, setParticipantMutedOnly] = useState(false);
  const [participantBannedOnly, setParticipantBannedOnly] = useState(false);
  const [participantPage, setParticipantPage] = useState(0);
  const [menuState, setMenuState] = useState(null);

  const actorRole = normalizedRole(chat?.myRole);
  const fullAdmin = canFullAdmin(actorRole);
  const modOnly = canModerationOnly(actorRole);
  const canManage = fullAdmin || modOnly;
  const canChangePermissions = actorRole === "OWNER";
  const canArchiveGroup = actorRole === "OWNER";

  const participants = Array.isArray(chat?.groupParticipants) ? chat.groupParticipants : [];
  const assignableRoles = useMemo(() => assignableRoleValues(actorRole), [actorRole]);

  const hasMutedData = useMemo(
    () => participants.some((p) => !p.banned && Boolean(p.mutedUntil)),
    [participants]
  );
  const hasBannedData = useMemo(() => participants.some((p) => Boolean(p.banned)), [participants]);

  useEffect(() => {
    const t = window.setTimeout(
      () => setParticipantFilterDebounced(participantFilterInput.trim().toLowerCase()),
      PARTICIPANT_FILTER_DEBOUNCE_MS
    );
    return () => window.clearTimeout(t);
  }, [participantFilterInput]);

  const filteredParticipants = useMemo(() => {
    let list = participants;
    const roleWanted = participantRoleFilter.trim();
    if (roleWanted) {
      const want = normalizedRole(roleWanted);
      list = list.filter((p) => normalizedRole(p.role) === want);
    }
    if (participantMutedOnly) {
      list = list.filter((p) => !p.banned && Boolean(p.mutedUntil));
    }
    if (participantBannedOnly) {
      list = list.filter((p) => Boolean(p.banned));
    }
    if (participantFilterDebounced) {
      const q = participantFilterDebounced;
      list = list.filter((p) => {
        const name = participantDisplayName(p).toLowerCase();
        const uname = String(p.username || "").toLowerCase();
        const id = String(p.userId || "");
        return name.includes(q) || uname.includes(q) || id.includes(q);
      });
    }
    return list;
  }, [
    participants,
    participantFilterDebounced,
    participantRoleFilter,
    participantMutedOnly,
    participantBannedOnly,
  ]);

  const filteredCount = filteredParticipants.length;
  const totalPages = filteredCount === 0 ? 1 : Math.ceil(filteredCount / PARTICIPANT_PAGE_SIZE);
  const safePage = Math.min(participantPage, Math.max(0, totalPages - 1));
  const pageSliceStart = safePage * PARTICIPANT_PAGE_SIZE;
  const visibleParticipants = useMemo(
    () => filteredParticipants.slice(pageSliceStart, pageSliceStart + PARTICIPANT_PAGE_SIZE),
    [filteredParticipants, pageSliceStart]
  );

  useEffect(() => {
    setParticipantPage(0);
  }, [participantFilterDebounced, participantRoleFilter, participantMutedOnly, participantBannedOnly, chat?.id]);

  useEffect(() => {
    setParticipantPage((p) => Math.min(p, Math.max(0, totalPages - 1)));
  }, [totalPages]);

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
        if (!cancelled) setGroupActionError(e?.message || "Invite search failed");
      } finally {
        if (!cancelled) setInviteLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fullAdmin, inviteQuery, chat?.groupParticipants, me?.id]);

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

  const closeMenu = useCallback(() => setMenuState(null), []);

  const runParticipantCommand = useCallback(
    async (kind, participant, extra = {}) => {
      closeMenu();

      if (kind === "remove") {
        if (
          !confirmDestructive(
            l(
              "Исключить этого участника из группы? Его сообщения останутся в истории у других.",
              "Remove this participant from the group? Their past messages remain for others."
            )
          )
        ) {
          return;
        }
      }

      if (kind === "ban") {
        if (
          !confirmDestructive(
            l(
              "Забанить участника? Это действие можно отменить только разбаном.",
              "Ban this participant? This can only be undone by unbanning them."
            )
          )
        ) {
          return;
        }
      }

      if (kind === "role" && normalizedRole(extra.role) === "OWNER") {
        if (
          !confirmDestructive(
            l(
              "Передать владение группой этому участнику? Ваша роль станет администратором.",
              "Transfer group ownership to this participant? You will become an admin."
            )
          )
        ) {
          return;
        }
      }

      if (kind === "mute") {
        const def = "60";
        const raw =
          typeof window !== "undefined"
            ? window.prompt(
                l(
                  "Длительность мута в минутах (1–43200):",
                  "Mute duration in minutes (1–43200):"
                ),
                def
              )
            : def;
        if (raw == null) return;
        const minutes = Number(String(raw).trim());
        if (!Number.isFinite(minutes) || minutes < 1 || minutes > 43200) {
          setGroupActionError(
            l("Некорректная длительность мута.", "Invalid mute duration.")
          );
          return;
        }
        extra = { ...extra, minutes };
      }

      if (kind === "ban") {
        const reasonRaw =
          typeof window !== "undefined"
            ? window.prompt(
                l("Причина бана (необязательно):", "Ban reason (optional):"),
                ""
              )
            : "";
        if (reasonRaw == null) return;
        extra = { ...extra, reason: String(reasonRaw) };
      }

      setGroupActionBusy(true);
      setGroupActionError("");
      try {
        if (kind === "role") {
          await api.patchParticipantRole(chat.id, participant.userId, extra.role);
        } else if (kind === "remove") {
          await api.removeGroupParticipant(chat.id, participant.userId);
        } else if (kind === "mute") {
          await api.muteGroupParticipant(chat.id, participant.userId, extra.minutes);
        } else if (kind === "unmute") {
          await api.unmuteGroupParticipant(chat.id, participant.userId);
        } else if (kind === "ban") {
          await api.banGroupParticipant(chat.id, participant.userId, extra.reason || "");
        } else if (kind === "unban") {
          await api.unbanGroupParticipant(chat.id, participant.userId);
        }
        await onRefreshGroup?.(chat.id);
      } catch (err) {
        setGroupActionError(err?.message || l("Ошибка действия", "Action failed"));
      } finally {
        setGroupActionBusy(false);
      }
    },
    [chat.id, l, onRefreshGroup, closeMenu]
  );

  const openMenuForParticipant = useCallback(
    (participant, anchorX, anchorY) => {
      const desc = buildParticipantMenuDescriptors({
        l,
        participant,
        actorRole,
        meId: me?.id,
        fullAdmin,
        assignableRoles,
        run: runParticipantCommand,
      });
      if (!desc.length) return;
      setMenuState({
        participant,
        x: anchorX,
        y: anchorY,
        ariaLabel: l("Действия с участником", "Participant actions"),
      });
    },
    [actorRole, assignableRoles, fullAdmin, l, me?.id, runParticipantCommand]
  );

  const menuDescriptors = useMemo(() => {
    if (!menuState?.participant) return [];
    return buildParticipantMenuDescriptors({
      l,
      participant: menuState.participant,
      actorRole,
      meId: me?.id,
      fullAdmin,
      assignableRoles,
      run: runParticipantCommand,
    });
  }, [menuState, actorRole, assignableRoles, fullAdmin, l, me?.id, runParticipantCommand]);

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

      <section className="group-admin-participants-block" aria-label={l("Участники", "Participants")}>
        <h3 className="group-admin-participants-block__title">{l("Участники", "Participants")}</h3>

        <div className="group-admin-filters">
          <div className="group-admin-filters__row">
            <label className="field-label" htmlFor="ga-participant-filter">
              {l("Поиск", "Search")}
            </label>
            <input
              id="ga-participant-filter"
              className="field-inp"
              value={participantFilterInput}
              onChange={(e) => setParticipantFilterInput(e.target.value)}
              placeholder={l("Имя, @username, id…", "Name, @username, id…")}
              autoComplete="off"
              aria-describedby="ga-participant-filter-hint"
            />
          </div>
          <div className="group-admin-filters__row group-admin-filters__row--split">
            <div className="group-admin-filters__field">
              <label className="field-label" htmlFor="ga-participant-role-filter">
                {l("Роль", "Role")}
              </label>
              <select
                id="ga-participant-role-filter"
                className="field-inp"
                value={participantRoleFilter}
                onChange={(e) => setParticipantRoleFilter(e.target.value)}
              >
                <option value="">{l("Все роли", "All roles")}</option>
                <option value="MEMBER">{l("Участник", "Member")}</option>
                <option value="MODERATOR">{l("Модератор", "Moderator")}</option>
                <option value="ADMIN">{l("Администратор", "Admin")}</option>
                <option value="OWNER">{l("Владелец", "Owner")}</option>
              </select>
            </div>
            {(hasMutedData || hasBannedData) && (
              <div className="group-admin-filters__toggles" role="group" aria-label={l("Статус", "Status")}>
                {hasMutedData && (
                  <label className="group-admin-filter-chip">
                    <input
                      type="checkbox"
                      checked={participantMutedOnly}
                      onChange={(e) => setParticipantMutedOnly(e.target.checked)}
                    />
                    <span>{l("Только с мутом", "Muted only")}</span>
                  </label>
                )}
                {hasBannedData && (
                  <label className="group-admin-filter-chip">
                    <input
                      type="checkbox"
                      checked={participantBannedOnly}
                      onChange={(e) => setParticipantBannedOnly(e.target.checked)}
                    />
                    <span>{l("Только бан", "Banned only")}</span>
                  </label>
                )}
              </div>
            )}
          </div>
        </div>
        <p id="ga-participant-filter-hint" className="tool-note group-admin-hint group-admin-participants-block__hint">
          {l(
            "Поиск и фильтры выполняются на устройстве. Список ниже прокручивается отдельно; страницы по 30 совпадений.",
            "Search and filters run on this device. The list below scrolls on its own; pages show 30 matches each."
          )}
        </p>

        <div className="group-participant-picker" role="list" aria-busy={groupActionBusy}>
        {visibleParticipants.map((p) => {
          const id = String(p.userId);
          const menuPreview = buildParticipantMenuDescriptors({
            l,
            participant: p,
            actorRole,
            meId: me?.id,
            fullAdmin,
            assignableRoles,
            run: runParticipantCommand,
          });
          const hasMenu = canManage && menuPreview.length > 0;
          const menuOpen = menuState && String(menuState.participant?.userId) === id;

          return (
            <div
              key={p.userId}
              className={`group-participant-row-wrap${menuOpen ? " group-participant-row-wrap--active" : ""}`}
              onContextMenu={
                hasMenu
                  ? (e) => {
                      e.preventDefault();
                      openMenuForParticipant(p, e.clientX, e.clientY);
                    }
                  : undefined
              }
            >
              <div
                className={`group-participant-row${hasMenu ? " group-participant-row--interactive" : ""}`}
                role="listitem"
              >
                <span className="group-participant-row__main">
                  <span className="group-participant-row__name">{participantDisplayName(p)}</span>
                  <span className="group-participant-row__meta">
                    {String(p.role || "MEMBER").toUpperCase()}
                    {p.banned ? ` · ${l("Бан", "Banned")}` : ""}
                    {!p.banned && p.mutedUntil ? ` · ${l("Мут", "Muted")}` : ""}
                  </span>
                </span>
                {hasMenu && (
                  <button
                    type="button"
                    className="group-participant-overflow-btn"
                    aria-label={l("Действия с участником", "Participant actions")}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    onClick={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      openMenuForParticipant(p, r.left, r.bottom + 4);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
                        e.preventDefault();
                        const r = e.currentTarget.getBoundingClientRect();
                        openMenuForParticipant(p, r.left, r.bottom + 4);
                      }
                    }}
                  >
                    ⋯
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

        <nav className="group-admin-pagination" aria-label={l("Страницы списка участников", "Participant list pages")}>
          <button
            type="button"
            className="btn-sec group-admin-pagination__nav"
            disabled={safePage <= 0}
            onClick={() => setParticipantPage(safePage - 1)}
          >
            {l("Назад", "Previous")}
          </button>
          <span className="group-admin-pagination__status">
            {l(
              `Стр. ${safePage + 1} из ${totalPages} · ${filteredCount}`,
              `Page ${safePage + 1} of ${totalPages} · ${filteredCount}`
            )}
          </span>
          <button
            type="button"
            className="btn-sec group-admin-pagination__nav"
            disabled={safePage >= totalPages - 1}
            onClick={() => setParticipantPage(safePage + 1)}
          >
            {l("Далее", "Next")}
          </button>
          {totalPages > 1 && totalPages <= 8 && (
            <div className="group-admin-pagination__pages">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`group-admin-page-btn${i === safePage ? " group-admin-page-btn--active" : ""}`}
                  aria-current={i === safePage ? "page" : undefined}
                  onClick={() => setParticipantPage(i)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </nav>
      </section>

      {!canManage && (
        <div className="tool-note group-admin-hint">
          {l(
            "Управление участниками недоступно для вашей роли.",
            "Participant management is not available for your role."
          )}
        </div>
      )}

      {modOnly && canManage && (
        <p className="tool-note group-admin-hint">
          {l(
            "ПКМ или кнопка «⋯» — действия только для участников с ролью MEMBER.",
            "Right-click or “⋯” — actions apply only to members with the MEMBER role."
          )}
        </p>
      )}

      <ParticipantActionsMenu
        menuState={menuDescriptors.length ? menuState : null}
        descriptors={menuDescriptors}
        onClose={closeMenu}
        busy={groupActionBusy}
      />

      {fullAdmin && (
        <>
          <div className="group-admin-section-label tool-note">{l("Профиль группы", "Group profile")}</div>
          <label className="field-label" htmlFor="ga-group-name">
            {l("Название", "Name")}
          </label>
          <input
            id="ga-group-name"
            className="field-inp"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            autoComplete="off"
          />
          <label className="field-label" htmlFor="ga-group-bio">
            {l("Описание", "Description")}
          </label>
          <input
            id="ga-group-bio"
            className="field-inp"
            value={groupBio}
            onChange={(e) => setGroupBio(e.target.value)}
            autoComplete="off"
          />
          <div className="profile-bottom-actions single">
            <button
              type="button"
              className="btn-sec"
              disabled={groupActionBusy}
              onClick={async () => {
                setGroupActionBusy(true);
                setGroupActionError("");
                try {
                  await api.patchGroupSettings(chat.id, { name: groupName, bio: groupBio });
                  await onRefreshGroup?.(chat.id);
                } catch (e) {
                  setGroupActionError(e?.message || "Update failed");
                } finally {
                  setGroupActionBusy(false);
                }
              }}
            >
              {l("Сохранить профиль", "Save profile")}
            </button>
          </div>
        </>
      )}

      {canChangePermissions && (
        <>
          <div className="group-admin-section-label tool-note">
            {l("Политики группы (только владелец)", "Group policies (owner only)")}
          </div>
          <label className="field-label" htmlFor="ga-who-write">
            {l("Кто может писать", "Who can send messages")}
          </label>
          <p className="tool-note group-policy-hint">{policyWriteHint(l)}</p>
          <select
            id="ga-who-write"
            className="field-inp"
            value={whoCanWrite}
            onChange={(e) => setWhoCanWrite(e.target.value)}
          >
            <option value="ALL">{l("Все участники", "All participants")}</option>
            <option value="MODERATORS">{l("Модератор и выше", "Moderators and above")}</option>
            <option value="ADMINS">{l("Админ и выше", "Admins and above")}</option>
            <option value="OWNER">{l("Только владелец", "Owner only")}</option>
          </select>

          <label className="field-label" htmlFor="ga-who-edit">
            {l("Кто может менять информацию о группе", "Who can edit group info")}
          </label>
          <p className="tool-note group-policy-hint">{policyEditInfoHint(l)}</p>
          <select
            id="ga-who-edit"
            className="field-inp"
            value={whoCanEditInfo}
            onChange={(e) => setWhoCanEditInfo(e.target.value)}
          >
            <option value="ANYONE">{l("Любой участник", "Any participant")}</option>
            <option value="MODERATORS">{l("Модератор и выше", "Moderators and above")}</option>
            <option value="ADMINS">{l("Админ и выше", "Admins and above")}</option>
            <option value="OWNER">{l("Только владелец", "Owner only")}</option>
          </select>

          <label className="field-label" htmlFor="ga-who-invite">
            {l("Кто может приглашать", "Who can invite")}
          </label>
          <p className="tool-note group-policy-hint">{policyInviteHint(l)}</p>
          <select
            id="ga-who-invite"
            className="field-inp"
            value={whoCanInvite}
            onChange={(e) => setWhoCanInvite(e.target.value)}
          >
            <option value="ANYONE">{l("Любой участник", "Any participant")}</option>
            <option value="MODERATORS">{l("Модератор и выше", "Moderators and above")}</option>
            <option value="ADMINS">{l("Админ и выше", "Admins and above")}</option>
            <option value="OWNER">{l("Только владелец", "Owner only")}</option>
          </select>
          <div className="profile-bottom-actions single">
            <button
              type="button"
              className="btn-sec"
              disabled={groupActionBusy}
              onClick={async () => {
                setGroupActionBusy(true);
                setGroupActionError("");
                try {
                  await api.patchGroupPermissions(chat.id, { whoCanWrite, whoCanEditInfo, whoCanInvite });
                  await onRefreshGroup?.(chat.id);
                } catch (e) {
                  setGroupActionError(e?.message || "Permissions update failed");
                } finally {
                  setGroupActionBusy(false);
                }
              }}
            >
              {l("Сохранить политики", "Save policies")}
            </button>
          </div>
        </>
      )}

      {fullAdmin && (
        <>
          <div className="group-admin-section-label tool-note">{l("Приглашения", "Invites")}</div>
          <label className="field-label" htmlFor="ga-invite-search">
            {l("Найти по имени пользователя", "Find by username")}
          </label>
          <input
            id="ga-invite-search"
            className="field-inp"
            value={inviteQuery}
            onChange={(e) => setInviteQuery(e.target.value)}
            placeholder={l("Минимум 2 символа", "At least 2 characters")}
            autoComplete="off"
          />
          {inviteLoading && <div className="tool-note">{l("Поиск…", "Searching…")}</div>}
          {(inviteResults || []).slice(0, 8).map((u) => {
            const selected = selectedInviteIds.includes(u.id);
            return (
              <button
                key={u.id}
                type="button"
                className="tool-row"
                onClick={() =>
                  setSelectedInviteIds((prev) => (selected ? prev.filter((x) => x !== u.id) : [...prev, u.id]))
                }
              >
                <b>{u.firstName || u.username}</b>
                <i>{selected ? "✓" : "+"}</i>
              </button>
            );
          })}
        </>
      )}

      <div className="profile-bottom-actions single group-admin-footer-actions">
        {fullAdmin && (
          <button
            type="button"
            className="btn-pri"
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
                setGroupActionError(e?.message || "Invite failed");
              } finally {
                setGroupActionBusy(false);
              }
            }}
          >
            {l("Пригласить выбранных", "Invite selected")}
          </button>
        )}
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
                setGroupActionError(e?.message || "Archive failed");
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
