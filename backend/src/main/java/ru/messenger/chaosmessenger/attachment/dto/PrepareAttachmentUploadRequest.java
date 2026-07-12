package ru.messenger.chaosmessenger.attachment.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record PrepareAttachmentUploadRequest(
        @NotNull Long chatId,
        @NotNull @Min(1) @Max(104857600) Long size,
        @NotBlank
        @Pattern(regexp = "^[A-Za-z0-9+/]{43}=$", message = "checksumSha256 must be base64 SHA-256")
        String checksumSha256
) {
}
