package ru.messenger.chaosmessenger.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record VerifyCodeResponse(
        String status,
        boolean exists,
        @JsonProperty("isNewUser") boolean newUser,
        String phone,
        String setupToken,
        String token,
        String refreshToken,
        String deviceRegistrationToken,
        Long userId,
        String username
) {}
