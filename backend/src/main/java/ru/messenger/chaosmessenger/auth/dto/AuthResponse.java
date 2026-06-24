package ru.messenger.chaosmessenger.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AuthResponse(
        String status,
        boolean exists,
        @JsonProperty("isNewUser") boolean newUser,
        Long userId,
        String username,
        String email,
        String token,
        String refreshToken,
        String deviceRegistrationToken
) {
}
