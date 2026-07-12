package ru.messenger.chaosmessenger.auth.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.messenger.chaosmessenger.auth.dto.AuthResponse;
import ru.messenger.chaosmessenger.auth.dto.EmailLoginRequest;
import ru.messenger.chaosmessenger.auth.dto.EmailRegisterRequest;
import ru.messenger.chaosmessenger.auth.service.AuthService;
import ru.messenger.chaosmessenger.auth.service.RefreshCookieService;

@Tag(name = "Email auth", description = "Email/password registration and login")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class EmailAuthController {

    private final AuthService authService;
    private final RefreshCookieService refreshCookieService;

    @Operation(summary = "Register by email and password")
    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody EmailRegisterRequest request, HttpServletResponse response) {
        AuthResponse auth = authService.registerEmail(
                request.email(),
                request.password(),
                request.username(),
                request.firstName(),
                request.lastName(),
                request.avatarUrl()
        );
        refreshCookieService.write(response, auth.refreshToken());
        return withoutRefreshToken(auth);
    }

    /** Test-friendly delegate; Spring uses the HTTP-response overload above. */
    public AuthResponse register(EmailRegisterRequest request) {
        return register(request, null);
    }

    @Operation(summary = "Login by email and password")
    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody EmailLoginRequest request, HttpServletResponse response) {
        AuthResponse auth = authService.loginEmail(request.email(), request.password());
        refreshCookieService.write(response, auth.refreshToken());
        return withoutRefreshToken(auth);
    }

    /** Test-friendly delegate; Spring uses the HTTP-response overload above. */
    public AuthResponse login(EmailLoginRequest request) {
        return login(request, null);
    }

    private AuthResponse withoutRefreshToken(AuthResponse auth) {
        return new AuthResponse(
                auth.status(),
                auth.exists(),
                auth.newUser(),
                auth.userId(),
                auth.username(),
                auth.email(),
                auth.token(),
                null,
                auth.deviceRegistrationToken()
        );
    }
}
