package ru.messenger.chaosmessenger.backup.dto;

import jakarta.validation.constraints.NotBlank;

public record BackupImportRequest(
        @NotBlank String encryptedPayload,
        @NotBlank String salt,
        @NotBlank String iv,
        String backupType,
        String checksum
) {
}
