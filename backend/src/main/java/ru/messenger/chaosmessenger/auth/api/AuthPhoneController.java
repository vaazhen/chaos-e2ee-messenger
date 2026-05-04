package ru.messenger.chaosmessenger.auth.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ru.messenger.chaosmessenger.auth.dto.AccountExistsResponse;
import ru.messenger.chaosmessenger.auth.dto.AuthResponse;
import ru.messenger.chaosmessenger.auth.dto.LogoutResponse;
import ru.messenger.chaosmessenger.auth.dto.SendCodeResponse;
import ru.messenger.chaosmessenger.auth.dto.TokenRefreshResponse;
import ru.messenger.chaosmessenger.auth.dto.UsernameAvailabilityResponse;
import ru.messenger.chaosmessenger.auth.dto.VerifyCodeResponse;
import ru.messenger.chaosmessenger.auth.service.AuthService;

/**
 * Phone/SMS authentication and two-phase registration.
 *
 * New user flow:
 *   POST /send-code → POST /verify-code → setupToken
 *   → POST /complete-setup → JWT issued
 *
 * Returning user flow:
 *   POST /send-code → POST /verify-code → JWT issued directly
 */
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
    public SendCodeResponse sendCode(@Valid @RequestBody SendCodeRequest req) {
        return authService.sendCode(req.getPhone(), req.getVia());
    }

    @Operation(
        summary = "Verify SMS code",
        description = "Existing users receive `token`/`refreshToken`/`deviceRegistrationToken`. " +
                      "New users receive `setupToken` — call `/auth/complete-setup` next."
    )
    @PostMapping("/verify-code")
    public VerifyCodeResponse verifyCode(@Valid @RequestBody VerifyCodeRequest req) {
        return authService.verifyCode(req.getPhone(), req.getCode());
    }

    @Operation(
        summary = "Complete phone registration",
        description = "Exchange `setupToken` for a full JWT session after the user has filled in their profile."
    )
    @PostMapping("/complete-setup")
    public AuthResponse completeSetup(@Valid @RequestBody CompleteSetupRequest req) {
        return authService.completeSetup(
                req.getSetupToken(),
                req.getUsername(),
                req.getFirstName(),
                req.getLastName(),
                req.getAvatarUrl()
        );
    }

    @Operation(summary = "Refresh access token")
    @PostMapping("/refresh")
    public TokenRefreshResponse refresh(@Valid @RequestBody RefreshRequest req) {
        return authService.refresh(req.getRefreshToken());
    }

    @Operation(summary = "Logout — revoke the refresh token")
    @PostMapping("/logout")
    public LogoutResponse logout(@Valid @RequestBody RefreshRequest req) {
        return authService.logout(req.getRefreshToken());
    }

    @Data public static class SendCodeRequest {
        @NotBlank(message = "Phone number is required") private String phone;
        private String via;
    }

    @Data public static class VerifyCodeRequest {
        @NotBlank(message = "Phone number is required")      private String phone;
        @NotBlank(message = "Verification code is required") private String code;
    }

    @Data public static class RefreshRequest {
        @NotBlank(message = "Refresh token is required") private String refreshToken;
    }

    @Data public static class CompleteSetupRequest {
        @NotBlank(message = "Setup token is required")  private String setupToken;
        @NotBlank(message = "First name is required")   private String firstName;
        private String lastName;
        @NotBlank(message = "Username is required")     private String username;
        private String avatarUrl;
    }
}
