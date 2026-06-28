package ru.messenger.chaosmessenger.auth.dto;

public record UsernameAvailabilityResponse(String username, boolean valid, boolean available) {
}
