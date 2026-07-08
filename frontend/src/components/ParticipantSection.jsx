import { useMemo, useRef, useEffect, useLayoutEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { normalizedRole, canFullAdmin, canModerationOnly, eligibleParticipantForModerationAction, eligibleParticipantForRoleAction, assignableRoleValues } from "../utils/groupRbac";
import { formatMuteCountdown, participantMuteRemainingMs } from "../groupMute";
import useNowTicker from "../hooks/useNowTicker";

function participantDisplayName(p) {
  return String(p.firstName || p.username || p.userId || "").trim() || String(p.userId);
}

function buildParticipantMenuDescriptors({ l, participant, actorRole, meId, fullAdmin, assignableRoles, run }) {
  const items = [];
  const canMod = eligibleParticipantForModerationAction(actorRole, participant, meId);
  const canRole = fullAdmin && eligibleParticipantForRoleAction(actorRole, participant, meId);
  const banned = Boolean(participant.banned);
  const muted = Boolean(participant.mutedUntil) && !banned;
  const push = (entry) => items.push(entry);

  if (canMod && !banned) {
    if (muted) push({ key: "unmute", label: l("Снять мут", "Unmute"), run: () => run("unmute", participant) });
    else push({ key: "mute", label: l("Замутить…", "Mute…"), run: () => run("mute", participant) });
  }
  if (canMod) {
    if (banned) push({ key: "unban", label: l("Разбанить", "Unban"), run: () => run("unban", participant) });
    else push({ key: "ban", label: l("Забанить…", "Ban…"), run: () => run("ban", participant) });
    push({ key: "remove", label: l("Исключить из группы", "Remove from group"), danger: true, run: () => run("remove", participant) });
  }
  if (canRole && assignableRoles.length) {
    const roleItems = [];
    for (const r of assignableRoles) {
      if (normalizedRole(r) === normalizedRole(participant.role)) continue;
      roleItems.push({ key: `role-${r}`, label: l(`Роль: ${r}`, `Role: ${r}`), run: () => run("role", participant, { role: r }) });
    }
    if (roleItems.length && items.length) push({ key: "sep-before-roles", separator: true });
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
    <div ref={wrapRef} className="ctx-menu group-admin-ctx-menu" role="menu" aria-label={menuState.ariaLabel}
      style={{ left: menuState.x, top: menuState.y }}
      onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }}>
      {descriptors.map((d) =>
        d.separator ? <div key={d.key} className="menu-line" role="separator" />
          : <button key={d.key} type="button" role="menuitem" className={`ctx-item${d.danger ? " danger" : ""}`} disabled={busy} onClick={() => void d.run()}>{d.label}</button>
      )}
    </div>, document.body
  );
}

export default function ParticipantSection({ me, chat, l, onRefreshGroup }) {
  const [participantFilterInput, setParticipantFilterInput] = useState("");
  const [participantFilterDebounced, setParticipantFilterDebounced] = useState("");
  const [participantRoleFilter, setParticipantRoleFilter] = useState("");
  const [participantMutedOnly, setParticipantMutedOnly] = useState(false);
  const [participantBannedOnly, setParticipantBannedOnly] = useState(false);
  const [menuState, setMenuState] = useState(null);
  const [groupActionBusy, setGroupActionBusy] = useState(false);
  const [groupActionError, setGroupActionError] = useState("");

  const actorRole = normalizedRole(chat?.myRole);
  const fullAdmin = canFullAdmin(actorRole);
  const modOnly = canModerationOnly(actorRole);
  const canManage = fullAdmin || modOnly;
  const participants = Array.isArray(chat?.groupParticipants) ? chat.groupParticipants : [];
  const assignableRoles = useMemo(() => assignableRoleValues(actorRole), [actorRole]);

  const hasMutedData = useMemo(() => participants.some((p) => !p.banned && Boolean(p.mutedUntil)), [participants]);
  const hasBannedData = useMemo(() => participants.some((p) => Boolean(p.banned)), [participants]);
  const participantMuteTickerNow = useNowTicker(hasMutedData);

  useEffect(() => {
    const t = window.setTimeout(() => setParticipantFilterDebounced(participantFilterInput.trim().toLowerCase()), 150);
    return () => window.clearTimeout(t);
  }, [participantFilterInput]);

  const filteredParticipants = useMemo(() => {
    let list = participants;
    const roleWanted = participantRoleFilter.trim();
    if (roleWanted) { const want = normalizedRole(roleWanted); list = list.filter((p) => normalizedRole(p.role) === want); }
    if (participantMutedOnly) list = list.filter((p) => !p.banned && Boolean(p.mutedUntil));
    if (participantBannedOnly) list = list.filter((p) => Boolean(p.banned));
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
  }, [participants, participantFilterDebounced, participantRoleFilter, participantMutedOnly, participantBannedOnly]);

  const filteredCount = filteredParticipants.length;

  const runParticipantCommand = useCallback(async (kind, participant, extra = {}) => {
    closeMenu();
    if (kind === "remove" && !window.confirm(l("Исключить этого участника из группы? Его сообщения останутся в истории у других.", "Remove this participant from the group? Their past messages remain for others."))) return;
    if (kind === "ban" && !window.confirm(l("Забанить участника? Это действие можно отменить только разбаном.", "Ban this participant? This can only be undone by unbanning them."))) return;
    if (kind === "role" && normalizedRole(extra.role) === "OWNER" && !window.confirm(l("Передать владение группой этому участнику? Ваша роль станет администратором.", "Transfer group ownership to this participant? You will become an admin."))) return;
    if (kind === "mute") {
      const raw = window.prompt(l("Длительность мута в минутах (1–43200):", "Mute duration in minutes (1–43200):"), "60");
      if (raw == null) return;
      const minutes = Number(String(raw).trim());
      if (!Number.isFinite(minutes) || minutes < 1 || minutes > 43200) { setGroupActionError(l("Некорректная длительность мута.", "Invalid mute duration.")); return; }
      extra = { ...extra, minutes };
    }
    if (kind === "ban") {
      const reasonRaw = window.prompt(l("Причина бана (необязательно):", "Ban reason (optional):"), "");
      if (reasonRaw == null) return;
      extra = { ...extra, reason: String(reasonRaw) };
    }
    setGroupActionBusy(true);
    setGroupActionError("");
    try {
      const { api } = await import("../api");
      if (kind === "role") await api.patchParticipantRole(chat.id, participant.userId, extra.role);
      else if (kind === "remove") await api.removeGroupParticipant(chat.id, participant.userId);
      else if (kind === "mute") await api.muteGroupParticipant(chat.id, participant.userId, extra.minutes);
      else if (kind === "unmute") await api.unmuteGroupParticipant(chat.id, participant.userId);
      else if (kind === "ban") await api.banGroupParticipant(chat.id, participant.userId, extra.reason || "");
      else if (kind === "unban") await api.unbanGroupParticipant(chat.id, participant.userId);
      await onRefreshGroup?.(chat.id);
    } catch (err) {
      setGroupActionError(err?.message || l("Ошибка действия", "Action failed"));
    } finally {
      setGroupActionBusy(false);
    }
  }, [chat.id, chat?.groupParticipants, l, onRefreshGroup]);

  const closeMenu = useCallback(() => setMenuState(null), []);

  const openMenuForParticipant = useCallback((participant, anchorX, anchorY) => {
    const desc = buildParticipantMenuDescriptors({ l, participant, actorRole, meId: me?.id, fullAdmin, assignableRoles, run: runParticipantCommand });
    if (!desc.length) return;
    setMenuState({ participant, x: anchorX, y: anchorY, ariaLabel: l("Действия с участником", "Participant actions") });
  }, [actorRole, assignableRoles, fullAdmin, l, me?.id, runParticipantCommand]);

  const menuDescriptors = useMemo(() => {
    if (!menuState?.participant) return [];
    return buildParticipantMenuDescriptors({ l, participant: menuState.participant, actorRole, meId: me?.id, fullAdmin, assignableRoles, run: runParticipantCommand });
  }, [menuState, actorRole, assignableRoles, fullAdmin, l, me?.id, runParticipantCommand]);

  return (
    <section className="group-admin-section group-admin-section--participants" aria-label={l("Участники", "Participants")}>
      <h3 className="group-admin-section__title">{l("Участники", "Participants")}</h3>
      {groupActionError && <div className="profile-error">{groupActionError}</div>}

      <div className="group-admin-filters">
        <div className="group-admin-filters__row">
          <label className="field-label" htmlFor="ga-participant-filter">{l("Поиск", "Search")}</label>
          <input id="ga-participant-filter" className="field-inp" value={participantFilterInput}
            onChange={(e) => setParticipantFilterInput(e.target.value)} placeholder={l("Имя, @username, id…", "Name, @username, id…")} autoComplete="off" />
        </div>
        <div className="group-admin-filters__row group-admin-filters__row--split">
          <div className="group-admin-filters__field">
            <label className="field-label" htmlFor="ga-participant-role-filter">{l("Роль", "Role")}</label>
            <select id="ga-participant-role-filter" className="field-inp" value={participantRoleFilter} onChange={(e) => setParticipantRoleFilter(e.target.value)}>
              <option value="">{l("Все роли", "All roles")}</option>
              <option value="MEMBER">{l("Участник", "Member")}</option>
              <option value="MODERATOR">{l("Модератор", "Moderator")}</option>
              <option value="ADMIN">{l("Администратор", "Admin")}</option>
              <option value="OWNER">{l("Владелец", "Owner")}</option>
            </select>
          </div>
          {(hasMutedData || hasBannedData) && (
            <div className="group-admin-filters__toggles" role="group" aria-label={l("Статус", "Status")}>
              {hasMutedData && <label className="group-admin-filter-chip"><input type="checkbox" checked={participantMutedOnly} onChange={(e) => setParticipantMutedOnly(e.target.checked)} /><span>{l("Только с мутом", "Muted only")}</span></label>}
              {hasBannedData && <label className="group-admin-filter-chip"><input type="checkbox" checked={participantBannedOnly} onChange={(e) => setParticipantBannedOnly(e.target.checked)} /><span>{l("Только бан", "Banned only")}</span></label>}
            </div>
          )}
        </div>
      </div>
      <p id="ga-participant-filter-hint" className="tool-note group-admin-hint group-admin-section__hint">
        {l("Поиск и фильтры выполняются на устройстве. Все совпадения в одном списке — прокрутите его ниже.", "Search and filters run on this device. All matches appear in one list — scroll below.")}
      </p>

      <div className="group-participant-picker" role="list" aria-busy={groupActionBusy} aria-label={l(`Участники: ${filteredCount}`, `Participants: ${filteredCount}`)}>
        {filteredParticipants.map((p) => {
          const id = String(p.userId);
          const hasMenu = canManage && buildParticipantMenuDescriptors({ l, participant: p, actorRole, meId: me?.id, fullAdmin, assignableRoles, run: runParticipantCommand }).length > 0;
          const menuOpen = menuState && String(menuState.participant?.userId) === id;
          return (
            <div key={p.userId} className={`group-participant-row-wrap${menuOpen ? " group-participant-row-wrap--active" : ""}`}
              onContextMenu={hasMenu ? (e) => { e.preventDefault(); openMenuForParticipant(p, e.clientX, e.clientY); } : undefined}>
              <div className={`group-participant-row${hasMenu ? " group-participant-row--interactive" : ""}`} role="listitem">
                <span className="group-participant-row__main">
                  <span className="group-participant-row__name">{participantDisplayName(p)}</span>
                  <span className="group-participant-row__meta">
                    {String(p.role || "MEMBER").toUpperCase()}
                    {p.banned ? ` · ${l("Бан", "Banned")}` : ""}
                    {!p.banned && p.mutedUntil ? (() => {
                      const untilMs = participantMuteRemainingMs(p.mutedUntil, participantMuteTickerNow);
                      const cd = formatMuteCountdown(untilMs, participantMuteTickerNow);
                      return cd ? ` · ${l("Мут", "Muted")} · ${cd}` : ` · ${l("Мут", "Muted")}`;
                    })() : ""}
                  </span>
                </span>
                {hasMenu && <button type="button" className="group-participant-overflow-btn" aria-label={l("Действия с участником", "Participant actions")}
                  aria-haspopup="menu" aria-expanded={menuOpen}
                  onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); openMenuForParticipant(p, r.left, r.bottom + 4); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); openMenuForParticipant(p, r.left, r.bottom + 4); } }}
                >⋯</button>}
              </div>
            </div>
          );
        })}
      </div>

      {!canManage && <div className="tool-note group-admin-hint">{l("Управление участниками недоступно для вашей роли.", "Participant management is not available for your role.")}</div>}
      {modOnly && canManage && <p className="tool-note group-admin-hint">{l("ПКМ или кнопка «⋯» — действия только для участников с ролью MEMBER.", "Right-click or “⋯” — actions apply only to members with the MEMBER role.")}</p>}

      <ParticipantActionsMenu menuState={menuDescriptors.length ? menuState : null} descriptors={menuDescriptors} onClose={closeMenu} busy={groupActionBusy} />
    </section>
  );
}

export { buildParticipantMenuDescriptors, participantDisplayName };