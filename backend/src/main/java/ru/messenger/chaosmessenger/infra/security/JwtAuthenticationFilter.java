package ru.messenger.chaosmessenger.infra.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import ru.messenger.chaosmessenger.auth.service.RefreshTokenService;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    public static final String SESSION_ID_ATTRIBUTE = "chaos.jwt.sessionId";

    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        String deviceId = request.getHeader("X-Device-Id");
        if (deviceId != null && !deviceId.isBlank()) {
            MDC.put("deviceId", deviceId);
        }

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            try {
                filterChain.doFilter(request, response);
            } finally {
                MDC.remove("deviceId");
            }
            return;
        }

        String token = authHeader.substring(7);

        try {
            String username = jwtService.extractUsername(token);
            if (username != null
                    && SecurityContextHolder.getContext().getAuthentication() == null
                    && jwtService.isTokenValid(token, username)
                    && !isSessionRevoked(token)) {
                UsernamePasswordAuthenticationToken authenticationToken =
                        new UsernamePasswordAuthenticationToken(
                                username,
                                null,
                                AuthorityUtils.NO_AUTHORITIES
                        );

                authenticationToken.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request)
                );

                SecurityContextHolder.getContext().setAuthentication(authenticationToken);
                request.setAttribute(SESSION_ID_ATTRIBUTE, jwtService.extractSessionId(token));
                MDC.put("userId", username);
            }
        } catch (Exception e) {
            log.warn("JWT authentication failed: {}", e.getMessage());
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove("userId");
            MDC.remove("deviceId");
        }
    }

    private boolean isSessionRevoked(String token) {
        String sessionId = jwtService.extractSessionId(token);
        if (sessionId == null || sessionId.isBlank()) {
            return true;
        }
        try {
            return refreshTokenService.isFamilyRevoked(sessionId);
        } catch (Exception e) {
            log.warn("Refresh-family lookup failed; denying access token: {}", e.getMessage());
            return true;
        }
    }
}
