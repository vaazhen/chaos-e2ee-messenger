package ru.messenger.chaosmessenger.message.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReactionRequest(
        @NotBlank(message = "Emoji is required")
        @Size(max = 16, message = "Emoji is too long")
        String emoji
) {}
