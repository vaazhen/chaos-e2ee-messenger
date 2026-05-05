/** Group mute helpers: server may return mutedUntil even after expiry until the next fetch. */

export function getActiveGroupMuteUntilMs(participants, myId) {
  if (!myId || !Array.isArray(participants)) return null;
  const me = participants.find((p) => String(p.userId) === String(myId));
  if (!me?.mutedUntil) return null;
  const t = Date.parse(me.mutedUntil);
  if (!Number.isFinite(t) || t <= Date.now()) return null;
  return t;
}

export function participantMuteRemainingMs(mutedUntilIso, nowMs = Date.now()) {
  if (!mutedUntilIso) return null;
  const t = Date.parse(mutedUntilIso);
  if (!Number.isFinite(t) || t <= nowMs) return null;
  return t;
}

export function formatMuteCountdown(untilMs, nowMs = Date.now()) {
  if (untilMs == null) return null;
  const ms = untilMs - nowMs;
  if (ms <= 0) return null;
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
