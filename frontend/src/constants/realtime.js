/** Backend publishes these on `/topic/users/.../chats` when group metadata or participants change. */
export const GROUP_CHAT_LIST_WS_REASONS = new Set([
  "group_settings_updated",
  "group_permissions_updated",
  "group_role_updated",
  "group_participants_invited",
  "group_participant_removed",
  "group_participant_muted",
  "group_participant_unmuted",
  "group_participant_banned",
  "group_participant_unbanned",
  "group_archived",
]);
