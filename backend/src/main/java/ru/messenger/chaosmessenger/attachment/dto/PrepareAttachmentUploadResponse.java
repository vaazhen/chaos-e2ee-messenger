package ru.messenger.chaosmessenger.attachment.dto;

import java.time.Instant;
import java.util.Map;

public record PrepareAttachmentUploadResponse(
        String attachmentId,
        String uploadUrl,
        Map<String, String> requiredHeaders,
        Instant expiresAt
) {
}
