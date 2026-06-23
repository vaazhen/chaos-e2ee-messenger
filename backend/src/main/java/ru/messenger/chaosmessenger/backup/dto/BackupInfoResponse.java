package ru.messenger.chaosmessenger.backup.dto;

public record BackupInfoResponse(
        boolean hasBackup,
        Integer latestVersion,
        Integer backupCount,
        String createdAt
) {}
