package ru.messenger.chaosmessenger.auth.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ru.messenger.chaosmessenger.auth.dto.AuthResponse;
import ru.messenger.chaosmessenger.auth.service.AuthService;

@Tag(name = "Email auth", description = "Email/password registration and login")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class EmailAuthController {

    private final AuthService authService;

    @Operation(summary = "Register by email and password")
    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody EmailRegisterRequest req) {
        return authService.registerEmail(
                req.getEmail(),
                req.getPassword(),
                req.getUsername(),
                req.getFirstName(),
                req.getLastName(),
                req.getAvatarUrl()
        );
    }

    @Operation(summary = "Login by email and password")
    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody EmailLoginRequest req) {
        return authService.loginEmail(req.getEmail(), req.getPassword());
    }

    @Data public static class EmailRegisterRequest {
        @Email(message = "Invalid email") @NotBlank(message = "Email is required") private String email;
        @Size(min = 6, max = 72) @NotBlank(message = "Password is required") private String password;
        private String username; private String firstName; private String lastName; private String avatarUrl;
    }

    @Data public static class EmailLoginRequest {
        @Email(message = "Invalid email") @NotBlank(message = "Email is required") private String email;
        @NotBlank(message = "Password is required") private String password;
    }
}
