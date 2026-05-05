package ru.messenger.chaosmessenger.auth.api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthPhoneControllerTest {

    @Mock AuthService authService;

    @InjectMocks AuthPhoneController controller;

    @Test
    void existsDelegatesToAuthService() {
        when(authService.accountExists("8 (900) 123-45-67"))
                .thenReturn(new AccountExistsResponse(true, "+79001234567"));

        var response = controller.exists("8 (900) 123-45-67");

        assertThat(response.exists()).isTrue();
        assertThat(response.phone()).isEqualTo("+79001234567");
        verify(authService).accountExists("8 (900) 123-45-67");
    }

    @Test
    void sendCodeDelegatesToAuthService() {
        SendCodeRequest request = new SendCodeRequest("9001234567", "telegram");

        when(authService.sendCode("9001234567", "telegram"))
                .thenReturn(new SendCodeResponse(true, "+79001234567"));

        var response = controller.sendCode(request);

        assertThat(response.sent()).isTrue();
        assertThat(response.phone()).isEqualTo("+79001234567");
        verify(authService).sendCode("9001234567", "telegram");
    }

    @Test
    void verifyCodeForNewUserReturnsSetupTokenWithoutJwt() {
        VerifyCodeRequest request = new VerifyCodeRequest("+79001234567", "111111");

        when(authService.verifyCode("+79001234567", "111111"))
                .thenReturn(new VerifyCodeResponse(
                        "ok",
                        false,
                        true,
                        "+79001234567",
                        "setup-token-1",
                        null,
                        null,
                        null,
                        null,
                        null
                ));

        var response = controller.verifyCode(request);

        assertThat(response.status()).isEqualTo("ok");
        assertThat(response.exists()).isFalse();
        assertThat(response.newUser()).isTrue();
        assertThat(response.phone()).isEqualTo("+79001234567");
        assertThat(response.setupToken()).isEqualTo("setup-token-1");
        assertThat(response.token()).isNull();
        assertThat(response.refreshToken()).isNull();
        assertThat(response.deviceRegistrationToken()).isNull();
    }

    @Test
    void verifyCodeForExistingUserReturnsJwtRefreshAndDeviceRegistrationToken() {
        VerifyCodeRequest request = new VerifyCodeRequest("8 900 123 45 67", "222222");

        when(authService.verifyCode("8 900 123 45 67", "222222"))
                .thenReturn(new VerifyCodeResponse(
                        "ok",
                        true,
                        false,
                        "+79001234567",
                        null,
                        "jwt-token",
                        "refresh-token",
                        "device-token",
                        1L,
                        "alice"
                ));

        var response = controller.verifyCode(request);

        assertThat(response.status()).isEqualTo("ok");
        assertThat(response.exists()).isTrue();
        assertThat(response.newUser()).isFalse();
        assertThat(response.token()).isEqualTo("jwt-token");
        assertThat(response.refreshToken()).isEqualTo("refresh-token");
        assertThat(response.deviceRegistrationToken()).isEqualTo("device-token");
        assertThat(response.userId()).isEqualTo(1L);
        assertThat(response.username()).isEqualTo("alice");
        assertThat(response.setupToken()).isNull();
    }

    @Test
    void completeSetupDelegatesToAuthService() {
        CompleteSetupRequest request = new CompleteSetupRequest(
                "setup-token", "Alice", "Smith", "alice", "avatar.png");

        when(authService.completeSetup("setup-token", "alice", "Alice", "Smith", "avatar.png"))
                .thenReturn(new AuthResponse(
                        "ok",
                        true,
                        false,
                        1L,
                        "alice",
                        "alice@test.com",
                        "jwt",
                        "refresh",
                        "device-token"
                ));

        var response = controller.completeSetup(request);

        assertThat(response.status()).isEqualTo("ok");
        assertThat(response.username()).isEqualTo("alice");
        assertThat(response.token()).isEqualTo("jwt");
        verify(authService).completeSetup("setup-token", "alice", "Alice", "Smith", "avatar.png");
    }

    @Test
    void completeSetupPropagatesInvalidSetupToken() {
        CompleteSetupRequest request = completeSetupRequest("bad-token", "Alice", "alice");

        when(authService.completeSetup("bad-token", "alice", "Alice", null, null))
                .thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_or_expired_setup_token"));

        assertThatThrownBy(() -> controller.completeSetup(request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    @Test
    void usernameAvailableReturnsTypedResponse() {
        when(authService.usernameAvailable(" Free_Name "))
                .thenReturn(new UsernameAvailabilityResponse("free_name", true, true));

        var response = controller.usernameAvailable(" Free_Name ");

        assertThat(response.username()).isEqualTo("free_name");
        assertThat(response.valid()).isTrue();
        assertThat(response.available()).isTrue();
        verify(authService).usernameAvailable(" Free_Name ");
    }

    @Test
    void refreshDelegatesToAuthService() {
        RefreshRequest request = new RefreshRequest("old-refresh");

        when(authService.refresh("old-refresh"))
                .thenReturn(new TokenRefreshResponse("new-jwt", "new-refresh", "new-device-token"));

        var response = controller.refresh(request);

        assertThat(response.token()).isEqualTo("new-jwt");
        assertThat(response.refreshToken()).isEqualTo("new-refresh");
        assertThat(response.deviceRegistrationToken()).isEqualTo("new-device-token");
        verify(authService).refresh("old-refresh");
    }

    @Test
    void logoutDelegatesToAuthService() {
        RefreshRequest request = new RefreshRequest("refresh-token");

        when(authService.logout("refresh-token")).thenReturn(new LogoutResponse(true));

        var response = controller.logout(request);

        assertThat(response.loggedOut()).isTrue();
        verify(authService).logout("refresh-token");
    }

    private static CompleteSetupRequest completeSetupRequest(String setupToken, String firstName, String username) {
        return new CompleteSetupRequest(setupToken, firstName, null, username, null);
    }
}
