package ru.messenger.chaosmessenger.user.dto;

public record UpdateProfileResponse(
        Long id,
        String username,
        String email,
        String firstName,
        String lastName,
        String avatarUrl,
        String token
) {
}
