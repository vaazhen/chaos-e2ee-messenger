package ru.messenger.chaosmessenger.infra.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import ru.messenger.chaosmessenger.common.exception.AuthException;
import ru.messenger.chaosmessenger.crypto.device.CurrentDeviceService;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class ActiveDeviceFilter extends OncePerRequestFilter {

    private final CurrentDeviceService currentDeviceService;
    private final JsonAuthenticationEntryPoint authenticationEntryPoint;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path == null) {
            return true;
        }
        return !path.startsWith("/api/")
                || path.startsWith("/api/auth/")
                || path.equals("/api/crypto/devices/register")
                || path.equals("/api/crypto/devices/current")
                || path.startsWith("/api/v1/i18n/")
                || path.startsWith("/api/demo/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!isAuthenticatedPrincipal(authentication)) {
            filterChain.doFilter(request, response);
            return;
        }
        try {
            currentDeviceService.requireCurrentDevice();
            filterChain.doFilter(request, response);
        } catch (AuthException ex) {
            authenticationEntryPoint.write(
                    response,
                    HttpStatus.UNAUTHORIZED,
                    ex.getCode(),
                    ex.getMessage()
            );
        }
    }

    private static boolean isAuthenticatedPrincipal(Authentication authentication) {
        if (authentication == null) {
            return false;
        }
        String name = authentication.getName();
        return name != null && !name.isBlank() && !"anonymousUser".equalsIgnoreCase(name);
    }
}
