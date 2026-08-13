package ru.messenger.chaosmessenger.auth.service;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class RefreshCookieService {

    /** Production cookie. Requires HTTPS: the {@code __Host-} prefix mandates {@code Secure}. */
    public static final String COOKIE_NAME = "__Host-chaos_refresh";

    /**
     * Local HTTP cookie. Safari rejects {@code __Host-} + {@code Secure} on {@code http://localhost}.
     * Used when {@code chaos.auth.refresh-cookie-secure=false}.
     */
    public static final String LOCAL_COOKIE_NAME = "chaos_refresh";

    @Value("${chaos.auth.refresh-cookie-same-site:Strict}")
    private String sameSite;

    @Value("${chaos.auth.refresh-cookie-secure:true}")
    private boolean secure;

    public void write(HttpServletResponse response, String refreshToken) {
        if (response == null || refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        preventCaching(response);
        response.addHeader(HttpHeaders.SET_COOKIE, cookie(cookieName(), refreshToken, Duration.ofDays(30)).toString());
    }

    public void clear(HttpServletResponse response) {
        if (response == null) {
            return;
        }
        preventCaching(response);
        response.addHeader(HttpHeaders.SET_COOKIE, cookie(cookieName(), "", Duration.ZERO).toString());
    }

    public String resolve(String bodyToken, String cookieToken) {
        if (cookieToken != null && !cookieToken.isBlank()) {
            return cookieToken;
        }
        return bodyToken;
    }

    public String resolve(String bodyToken, String hostCookie, String localCookie) {
        return resolve(bodyToken, firstNonBlank(hostCookie, localCookie));
    }

    private String cookieName() {
        return secure ? COOKIE_NAME : LOCAL_COOKIE_NAME;
    }

    private static String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first;
        }
        if (second != null && !second.isBlank()) {
            return second;
        }
        return null;
    }

    private void preventCaching(HttpServletResponse response) {
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store, max-age=0");
        response.setHeader(HttpHeaders.PRAGMA, "no-cache");
    }

    private ResponseCookie cookie(String name, String value, Duration maxAge) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path("/")
                .maxAge(maxAge)
                .build();
    }
}
