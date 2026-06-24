package ru.messenger.chaosmessenger.auth.dto;

public record AccountExistsResponse(boolean exists, String phone) {
}
