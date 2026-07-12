package ru.messenger.chaosmessenger.auth.service;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class RefreshCookieService {

    public static final String COOKIE_NAME = "__Host-chaos_refresh";

    @Value("${chaos.auth.refresh-cookie-same-site:Strict}")
    private String sameSite;

    public void write(HttpServletResponse response, String refreshToken) {
        if (response == null || refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        preventCaching(response);
        response.addHeader(HttpHeaders.SET_COOKIE, cookie(refreshToken, Duration.ofDays(30)).toString());
    }

    public void clear(HttpServletResponse response) {
        if (response == null) {
            return;
        }
        preventCaching(response);
        response.addHeader(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString());
    }

    public String resolve(String bodyToken, String cookieToken) {
        if (cookieToken != null && !cookieToken.isBlank()) {
            return cookieToken;
        }
        return bodyToken;
    }

    private void preventCaching(HttpServletResponse response) {
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store, max-age=0");
        response.setHeader(HttpHeaders.PRAGMA, "no-cache");
    }

    private ResponseCookie cookie(String value, Duration maxAge) {
        return ResponseCookie.from(COOKIE_NAME, value)
                .httpOnly(true)
                .secure(true)
                .sameSite(sameSite)
                .path("/")
                .maxAge(maxAge)
                .build();
    }
}
