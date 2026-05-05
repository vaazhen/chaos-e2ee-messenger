package ru.messenger.chaosmessenger.message.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record UpdateMessageStatusRequest(
        @NotNull(message = "Message ID is required")
        Long messageId,
        @NotBlank(message = "Status is required")
        @Pattern(regexp = "DELIVERED|READ", message = "Status must be DELIVERED or READ")
        String status
) {}
