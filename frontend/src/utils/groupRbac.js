/** Mirrors backend {@code GroupRole} / {@code validateCanModerate} / {@code validateRoleChange}. */

export function normalizedRole(role) {
  return String(role || "MEMBER").toUpperCase();
}

export function rankOf(role) {
  const r = normalizedRole(role);
  if (r === "OWNER") return 3;
  if (r === "ADMIN") return 2;
  if (r === "MODERATOR") return 1;
  return 0;
}

export function canFullAdmin(actorRole) {
  const r = normalizedRole(actorRole);
  return r === "OWNER" || r === "ADMIN";
}

export function canModerationOnly(actorRole) {
  return normalizedRole(actorRole) === "MODERATOR";
}

/** Show group admin entry in UI (header button / modal). Members have no management strip. */
export function canOpenGroupAdmin(actorRole) {
  return canFullAdmin(actorRole) || canModerationOnly(actorRole);
}

/** Whether actor may mute / ban / remove / unmute / unban this target (not self; owner never targeted). */
export function canTargetForModeration(actorRole, targetRole) {
  const a = normalizedRole(actorRole);
  const t = normalizedRole(targetRole);
  if (t === "OWNER") return false;
  if (a === "MODERATOR") return t === "MEMBER";
  if (a === "ADMIN") return t === "MEMBER" || t === "MODERATOR";
  if (a === "OWNER") return true;
  return false;
}

/** Roles the actor may assign via API (UI must not show higher tiers than allowed). */
export function assignableRoleValues(actorRole) {
  const a = normalizedRole(actorRole);
  if (a === "OWNER") return ["MEMBER", "MODERATOR", "ADMIN", "OWNER"];
  if (a === "ADMIN") return ["MEMBER", "MODERATOR"];
  return [];
}

export function eligibleParticipantForRoleAction(actorRole, participant, meId) {
  if (String(participant.userId) === String(meId || "")) return false;
  const t = normalizedRole(participant.role);
  const a = normalizedRole(actorRole);
  if (t === "OWNER") return false;
  if (a === "ADMIN" && (t === "ADMIN" || t === "OWNER")) return false;
  return true;
}

export function eligibleParticipantForModerationAction(actorRole, participant, meId) {
  if (String(participant.userId) === String(meId || "")) return false;
  return canTargetForModeration(actorRole, participant.role);
}
