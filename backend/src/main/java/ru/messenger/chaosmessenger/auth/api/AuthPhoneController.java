package ru.messenger.chaosmessenger.auth.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ru.messenger.chaosmessenger.auth.dto.AccountExistsResponse;
import ru.messenger.chaosmessenger.auth.dto.AuthResponse;
import ru.messenger.chaosmessenger.auth.dto.CompleteSetupRequest;
import ru.messenger.chaosmessenger.auth.dto.LogoutResponse;
import ru.messenger.chaosmessenger.auth.dto.RefreshRequest;
import ru.messenger.chaosmessenger.auth.dto.SendCodeRequest;
import ru.messenger.chaosmessenger.auth.dto.SendCodeResponse;
import ru.messenger.chaosmessenger.auth.dto.TokenRefreshResponse;
import ru.messenger.chaosmessenger.auth.dto.UsernameAvailabilityResponse;
import ru.messenger.chaosmessenger.auth.dto.VerifyCodeRequest;
import ru.messenger.chaosmessenger.auth.dto.VerifyCodeResponse;
import ru.messenger.chaosmessenger.auth.service.AuthService;
import ru.messenger.chaosmessenger.auth.service.RefreshCookieService;

@Tag(name = "Authentication", description = "Registration and login")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthPhoneController {

    private final AuthService authService;
    private final RefreshCookieService refreshCookieService;

    @Operation(summary = "Check whether an account exists for the given phone number")
    @GetMapping("/exists")
    public AccountExistsResponse exists(@RequestParam("phone") String phone) {
        return authService.accountExists(phone);
    }

    @Operation(summary = "Check username availability during setup")
    @GetMapping("/username-available")
    public UsernameAvailabilityResponse usernameAvailable(@RequestParam("username") String username) {
        return authService.usernameAvailable(username);
    }

    @Operation(summary = "Send SMS verification code")
    @PostMapping("/send-code")
    public SendCodeResponse sendCode(@Valid @RequestBody SendCodeRequest request) {
        return authService.sendCode(request.phone(), request.via());
    }

    @Operation(summary = "Verify SMS code")
    @PostMapping("/verify-code")
    public VerifyCodeResponse verifyCode(@Valid @RequestBody VerifyCodeRequest request, HttpServletResponse response) {
        VerifyCodeResponse auth = authService.verifyCode(request.phone(), request.code());
        refreshCookieService.write(response, auth.refreshToken());
        return withoutRefreshToken(auth);
    }

    public VerifyCodeResponse verifyCode(VerifyCodeRequest request) {
        return verifyCode(request, null);
    }

    @Operation(summary = "Complete phone registration")
    @PostMapping("/complete-setup")
    public AuthResponse completeSetup(@Valid @RequestBody CompleteSetupRequest request, HttpServletResponse response) {
        AuthResponse auth = authService.completeSetup(
                request.setupToken(),
                request.username(),
                request.firstName(),
                request.lastName(),
                request.avatarUrl()
        );
        refreshCookieService.write(response, auth.refreshToken());
        return withoutRefreshToken(auth);
    }

    public AuthResponse completeSetup(CompleteSetupRequest request) {
        return completeSetup(request, null);
    }

    @Operation(summary = "Refresh access token")
    @PostMapping("/refresh")
    public TokenRefreshResponse refresh(
            @RequestBody(required = false) RefreshRequest request,
            @CookieValue(name = RefreshCookieService.COOKIE_NAME, required = false) String cookieToken,
            HttpServletResponse response
    ) {
        String bodyToken = request == null ? null : request.refreshToken();
        TokenRefreshResponse refreshed = authService.refresh(refreshCookieService.resolve(bodyToken, cookieToken));
        refreshCookieService.write(response, refreshed.refreshToken());
        return new TokenRefreshResponse(refreshed.token(), null, refreshed.deviceRegistrationToken());
    }

    public TokenRefreshResponse refresh(RefreshRequest request) {
        return refresh(request, null, null);
    }

    @Operation(summary = "Logout and revoke the refresh token")
    @PostMapping("/logout")
    public LogoutResponse logout(
            @RequestBody(required = false) RefreshRequest request,
            @CookieValue(name = RefreshCookieService.COOKIE_NAME, required = false) String cookieToken,
            HttpServletResponse response
    ) {
        String bodyToken = request == null ? null : request.refreshToken();
        LogoutResponse result = authService.logout(refreshCookieService.resolve(bodyToken, cookieToken));
        refreshCookieService.clear(response);
        return result;
    }

    public LogoutResponse logout(RefreshRequest request) {
        return logout(request, null, null);
    }

    private VerifyCodeResponse withoutRefreshToken(VerifyCodeResponse auth) {
        return new VerifyCodeResponse(
                auth.status(),
                auth.exists(),
                auth.newUser(),
                auth.phone(),
                auth.setupToken(),
                auth.token(),
                null,
                auth.deviceRegistrationToken(),
                auth.userId(),
                auth.username()
        );
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
