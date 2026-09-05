package ru.messenger.chaosmessenger.backup.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BackupImportRequest(
        @NotBlank @Size(max = 1_048_576) String encryptedPayload,
        @NotBlank @Size(max = 512) String salt,
        @NotBlank @Size(max = 512) String iv,
        @Size(max = 32) String backupType,
        @Size(max = 128) String checksum
) {
}
