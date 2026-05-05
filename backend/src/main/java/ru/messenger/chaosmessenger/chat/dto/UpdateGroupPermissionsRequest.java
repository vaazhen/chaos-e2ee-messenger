package ru.messenger.chaosmessenger.chat.dto;

/**
 * PATCH body for updating group permission policies. Each {@code null} field is
 * left untouched. Otherwise must be one of the policy enum values
 * (e.g. {@code ALL}, {@code MODERATORS}, {@code ADMINS}, {@code OWNER}).
 */
public record UpdateGroupPermissionsRequest(
        String whoCanWrite,
        String whoCanEditInfo,
        String whoCanInvite
) {}
