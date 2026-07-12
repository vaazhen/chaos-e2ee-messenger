package ru.messenger.chaosmessenger.attachment.dto;

import java.time.Instant;

public record AttachmentDownloadUrlResponse(String downloadUrl, Instant expiresAt) {
}
