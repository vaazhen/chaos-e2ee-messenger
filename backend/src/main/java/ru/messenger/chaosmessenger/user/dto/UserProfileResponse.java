package ru.messenger.chaosmessenger.user.dto;

public record UserProfileResponse(
        Long id,
        String username,
        String email,
        String firstName,
        String lastName,
        String avatarUrl
) {
}
