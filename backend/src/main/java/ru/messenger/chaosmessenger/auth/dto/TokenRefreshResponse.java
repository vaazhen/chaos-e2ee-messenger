package ru.messenger.chaosmessenger.auth.dto;

public record TokenRefreshResponse(String token, String refreshToken, String deviceRegistrationToken) {}
