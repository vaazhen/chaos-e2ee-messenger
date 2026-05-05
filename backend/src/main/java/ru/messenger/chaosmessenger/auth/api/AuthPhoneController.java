package ru.messenger.chaosmessenger.auth.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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

@Tag(name = "Authentication", description = "Registration and login")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthPhoneController {

    private final AuthService authService;

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

    @Operation(
            summary = "Verify SMS code",
            description = "Existing users receive token/refreshToken/deviceRegistrationToken. " +
                    "New users receive setupToken and must call complete-setup next."
    )
    @PostMapping("/verify-code")
    public VerifyCodeResponse verifyCode(@Valid @RequestBody VerifyCodeRequest request) {
        return authService.verifyCode(request.phone(), request.code());
    }

    @Operation(summary = "Complete phone registration")
    @PostMapping("/complete-setup")
    public AuthResponse completeSetup(@Valid @RequestBody CompleteSetupRequest request) {
        return authService.completeSetup(
                request.setupToken(),
                request.username(),
                request.firstName(),
                request.lastName(),
                request.avatarUrl()
        );
    }

    @Operation(summary = "Refresh access token")
    @PostMapping("/refresh")
    public TokenRefreshResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return authService.refresh(request.refreshToken());
    }

    @Operation(summary = "Logout and revoke the refresh token")
    @PostMapping("/logout")
    public LogoutResponse logout(@Valid @RequestBody RefreshRequest request) {
        return authService.logout(request.refreshToken());
    }
}
