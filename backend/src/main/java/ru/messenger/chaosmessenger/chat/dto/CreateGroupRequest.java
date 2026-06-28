package ru.messenger.chaosmessenger.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record CreateGroupRequest(
        @NotBlank(message = "Group name is required")
        String name,
        @NotEmpty(message = "Group must have at least one other member")
        List<Long> memberIds
) {
}
