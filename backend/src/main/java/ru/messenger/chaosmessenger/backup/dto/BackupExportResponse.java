package ru.messenger.chaosmessenger.backup.dto;

public record BackupExportResponse(
        Integer version,
        String encryptedPayload,
        String salt,
        String iv,
        String backupType,
        String createdAt
) {}
