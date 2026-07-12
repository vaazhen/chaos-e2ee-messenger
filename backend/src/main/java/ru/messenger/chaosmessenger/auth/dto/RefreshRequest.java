package ru.messenger.chaosmessenger.auth.dto;

/** Optional body fallback for non-browser clients. Browser clients use an HttpOnly cookie. */
public record RefreshRequest(String refreshToken) {
}
