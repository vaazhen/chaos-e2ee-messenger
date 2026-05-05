package ru.messenger.chaosmessenger.auth.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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

@Tag(name = "Email auth", description = "Email/password registration and login")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class EmailAuthController {

    private final AuthService authService;

    @Operation(summary = "Register by email and password")
    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody EmailRegisterRequest request) {
        return authService.registerEmail(
                request.email(),
                request.password(),
                request.username(),
                request.firstName(),
                request.lastName(),
                request.avatarUrl()
        );
    }

    @Operation(summary = "Login by email and password")
    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody EmailLoginRequest request) {
        return authService.loginEmail(request.email(), request.password());
    }
}
