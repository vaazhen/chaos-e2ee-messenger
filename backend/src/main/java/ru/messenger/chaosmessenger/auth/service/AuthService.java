package ru.messenger.chaosmessenger.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import ru.messenger.chaosmessenger.auth.dto.AccountExistsResponse;
import ru.messenger.chaosmessenger.auth.dto.AuthResponse;
import ru.messenger.chaosmessenger.auth.dto.LogoutResponse;
import ru.messenger.chaosmessenger.auth.dto.SendCodeResponse;
import ru.messenger.chaosmessenger.auth.dto.TokenRefreshResponse;
import ru.messenger.chaosmessenger.auth.dto.UsernameAvailabilityResponse;
import ru.messenger.chaosmessenger.auth.dto.VerifyCodeResponse;
import ru.messenger.chaosmessenger.infra.security.JwtService;
import ru.messenger.chaosmessenger.user.domain.User;
import ru.messenger.chaosmessenger.user.domain.UserStatus;
import ru.messenger.chaosmessenger.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final PhoneVerificationService verificationService;
    private final UserRepository userRepository;
    private final RefreshTokenService refreshTokenService;
    private final DeviceRegistrationTokenService deviceRegTokenService;
    private final JwtService jwtService;
    private final SetupTokenService setupTokenService;
    private final PasswordEncoder passwordEncoder;
    private final CredentialRateLimiter credentialRateLimiter;

    @Transactional(readOnly = true)
    public AccountExistsResponse accountExists(String phone) {
        String normalized = normalizePhone(phone);
        return new AccountExistsResponse(userRepository.existsByPhone(normalized), normalized);
    }

    @Transactional(readOnly = true)
    public UsernameAvailabilityResponse usernameAvailable(String username) {
        String normalized = username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
        boolean valid = normalized.matches("^[a-z0-9_]{3,32}$");
        boolean available = valid && !userRepository.existsByUsername(normalized);
        return new UsernameAvailabilityResponse(normalized, valid, available);
    }

    public SendCodeResponse sendCode(String phone, String via) {
        String normalized = normalizePhone(phone);
        verificationService.sendCode(normalized, via);
        return new SendCodeResponse(true, normalized);
    }

    @Transactional
    public VerifyCodeResponse verifyCode(String phone, String code) {
        String normalized = normalizePhone(phone);
        var result = verificationService.verifyCode(normalized, code);

        String setupToken = null;
        String token = null;
        String refreshToken = null;
        String deviceRegistrationToken = null;
        Long userId = null;
        String username = null;

        if (result.token() != null) {
            if (result.newUser()) {
                setupToken = setupTokenService.issue(normalized);
            } else {
                RefreshTokenService.IssuedToken session = refreshTokenService.issueSession(result.username());
                token = jwtService.generateToken(result.username(), session.sessionId());
                refreshToken = session.token();
                String challenge = deviceRegTokenService.markStrongAuth(result.username());
                deviceRegistrationToken = deviceRegTokenService.issue(result.username(), challenge);
                userId = result.userId();
                username = result.username();
            }
        }

        return new VerifyCodeResponse(
                result.status(),
                result.existingUser(),
                result.newUser(),
                normalized,
                setupToken,
                token,
                refreshToken,
                deviceRegistrationToken,
                userId,
                username
        );
    }

    @Transactional
    public AuthResponse completeSetup(String setupToken, String username, String firstName, String lastName, String avatarUrl) {
        String phone = setupTokenService.getPhone(setupToken);
        if (phone == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_or_expired_setup_token");
        }

        User user = userRepository.findByPhone(phone)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found for phone"));

        String newUsername = normalizeUsername(username);
        if (!newUsername.equals(user.getUsername()) && userRepository.existsByUsername(newUsername)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already taken");
        }

        String cleanFirstName = trimToNull(firstName);
        if (cleanFirstName == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "First name is required");
        }

        String consumedPhone = setupTokenService.consumePhone(setupToken);
        if (!phone.equals(consumedPhone)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_or_expired_setup_token");
        }

        user.setUsername(newUsername);
        user.setFirstName(cleanFirstName);
        user.setLastName(trimToNull(lastName));
        user.setAvatarUrl(trimToNull(avatarUrl));

        User savedUser = userRepository.save(user);
        String devChallenge = deviceRegTokenService.markStrongAuth(savedUser.getUsername());
        return buildAuthResponse(savedUser, false, devChallenge);
    }

    @Transactional
    public TokenRefreshResponse refresh(String refreshToken) {
        RefreshTokenService.Rotation rotation = refreshTokenService.rotate(refreshToken);
        if (rotation == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_or_reused_refresh_token");
        }

        return new TokenRefreshResponse(
                jwtService.generateToken(rotation.username(), rotation.sessionId()),
                rotation.token(),
                null
        );
    }

    public LogoutResponse logout(String refreshToken) {
        refreshTokenService.revoke(refreshToken);
        return new LogoutResponse(true);
    }

    @Transactional
    public AuthResponse registerEmail(String rawEmail, String password, String requestedUsername,
                                      String firstName, String lastName, String avatarUrl) {
        String email = normalizeEmail(rawEmail);
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }

        User user = new User();
        user.setEmail(email);
        user.setUsername(chooseUsername(requestedUsername, email));
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setFirstName(trimToNull(firstName));
        user.setLastName(trimToNull(lastName));
        user.setAvatarUrl(trimToNull(avatarUrl));
        user.setStatus(UserStatus.ACTIVE);
        user.setCreatedAt(LocalDateTime.now());

        User saved = userRepository.save(user);
        String devChallenge = deviceRegTokenService.markStrongAuth(saved.getUsername());
        return buildAuthResponse(saved, true, devChallenge);
    }

    @Transactional
    public AuthResponse loginEmail(String rawEmail, String password) {
        String email = normalizeEmail(rawEmail);
        credentialRateLimiter.checkAndIncrement(email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (user.getPasswordHash() == null
                || user.getPasswordHash().isBlank()
                || "PHONE_AUTH_ONLY".equals(user.getPasswordHash())
                || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        credentialRateLimiter.reset(email);
        String devChallenge = deviceRegTokenService.markStrongAuth(user.getUsername());
        return buildAuthResponse(user, false, devChallenge);
    }

    private AuthResponse buildAuthResponse(User user, boolean isNewUser, String deviceChallenge) {
        RefreshTokenService.IssuedToken session = refreshTokenService.issueSession(user.getUsername());
        return new AuthResponse(
                "ok",
                !isNewUser,
                isNewUser || user.getFirstName() == null || user.getFirstName().isBlank(),
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                jwtService.generateToken(user.getUsername(), session.sessionId()),
                session.token(),
                deviceChallenge != null ? deviceRegTokenService.issue(user.getUsername(), deviceChallenge) : null
        );
    }

    private String normalizePhone(String raw) {
        if (raw == null) {
            throw new IllegalArgumentException("Phone number is required");
        }
        String digits = raw.replaceAll("\\D", "");
        if (digits.isBlank()) {
            throw new IllegalArgumentException("Phone number is required");
        }
        if (digits.length() == 11 && digits.startsWith("8")) {
            digits = "7" + digits.substring(1);
        } else if (digits.length() == 10) {
            digits = "7" + digits;
        }
        if (digits.length() < 10 || digits.length() > 15) {
            throw new IllegalArgumentException("Phone number must contain 10 to 15 digits");
        }
        return "+" + digits;
    }

    private String normalizeEmail(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }
        return raw.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeUsername(String raw) {
        String value = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
        if (!value.matches("^[a-z0-9_]{3,32}$")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Username must be 3-32 chars: lowercase letters, digits, underscore"
            );
        }
        return value;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }

    private String chooseUsername(String requested, String email) {
        String base = trimToNull(requested);
        if (base == null) {
            base = email.substring(0, email.indexOf('@'));
        }
        base = base.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9_]", "_");
        base = base.replaceAll("_+", "_").replaceAll("^_+|_+$", "");
        if (base.length() < 3) {
            base = "user";
        }
        if (base.length() > 24) {
            base = base.substring(0, 24);
        }

        String candidate = base;
        int i = 1;
        while (userRepository.existsByUsername(candidate)) {
            String suffix = "_" + i++;
            candidate = base.substring(0, Math.min(base.length(), 32 - suffix.length())) + suffix;
            if (i > 100) {
                candidate = "user_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
                if (!userRepository.existsByUsername(candidate)) {
                    return candidate;
                }
            }
        }
        return candidate;
    }
}
