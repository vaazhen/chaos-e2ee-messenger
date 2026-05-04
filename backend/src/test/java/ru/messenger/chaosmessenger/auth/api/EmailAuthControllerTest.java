package ru.messenger.chaosmessenger.auth.api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import ru.messenger.chaosmessenger.auth.dto.AuthResponse;
import ru.messenger.chaosmessenger.auth.service.AuthService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailAuthControllerTest {

    @Mock AuthService authService;

    @InjectMocks EmailAuthController controller;

    @Test
    void registerDelegatesToAuthServiceAndReturnsTypedResponse() {
        EmailAuthController.EmailRegisterRequest request = registerRequest(" Alice@Test.COM ", "secret123");
        request.setUsername(" Alice--Profile ");
        request.setFirstName("  Alice  ");
        request.setLastName("  Smith  ");
        request.setAvatarUrl("  avatar.png  ");

        when(authService.registerEmail(
                " Alice@Test.COM ",
                "secret123",
                " Alice--Profile ",
                "  Alice  ",
                "  Smith  ",
                "  avatar.png  "
        )).thenReturn(new AuthResponse(
                "ok",
                false,
                true,
                10L,
                "alice_profile",
                "alice@test.com",
                "jwt",
                "refresh",
                "device-token"
        ));

        var response = controller.register(request);

        assertThat(response.status()).isEqualTo("ok");
        assertThat(response.exists()).isFalse();
        assertThat(response.newUser()).isTrue();
        assertThat(response.userId()).isEqualTo(10L);
        assertThat(response.username()).isEqualTo("alice_profile");
        assertThat(response.email()).isEqualTo("alice@test.com");
        assertThat(response.token()).isEqualTo("jwt");
        assertThat(response.refreshToken()).isEqualTo("refresh");
        assertThat(response.deviceRegistrationToken()).isEqualTo("device-token");

        verify(authService).registerEmail(
                " Alice@Test.COM ",
                "secret123",
                " Alice--Profile ",
                "  Alice  ",
                "  Smith  ",
                "  avatar.png  "
        );
    }

    @Test
    void registerPropagatesDuplicateEmailConflict() {
        EmailAuthController.EmailRegisterRequest request = registerRequest(" Alice@Test.COM ", "secret123");

        when(authService.registerEmail(" Alice@Test.COM ", "secret123", null, null, null, null))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered"));

        assertThatThrownBy(() -> controller.register(request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void loginDelegatesToAuthServiceAndReturnsTypedResponse() {
        EmailAuthController.EmailLoginRequest request = loginRequest(" Alice@Test.COM ", "secret123");

        when(authService.loginEmail(" Alice@Test.COM ", "secret123"))
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

        var response = controller.login(request);

        assertThat(response.status()).isEqualTo("ok");
        assertThat(response.exists()).isTrue();
        assertThat(response.newUser()).isFalse();
        assertThat(response.userId()).isEqualTo(1L);
        assertThat(response.username()).isEqualTo("alice");
        assertThat(response.email()).isEqualTo("alice@test.com");
        assertThat(response.token()).isEqualTo("jwt");
        assertThat(response.refreshToken()).isEqualTo("refresh");
        assertThat(response.deviceRegistrationToken()).isEqualTo("device-token");

        verify(authService).loginEmail(" Alice@Test.COM ", "secret123");
    }

    @Test
    void loginPropagatesUnauthorizedFromService() {
        EmailAuthController.EmailLoginRequest request = loginRequest("Missing@Test.COM", "secret123");

        when(authService.loginEmail("Missing@Test.COM", "secret123"))
                .thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        assertThatThrownBy(() -> controller.login(request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    private static EmailAuthController.EmailRegisterRequest registerRequest(String email, String password) {
        EmailAuthController.EmailRegisterRequest request = new EmailAuthController.EmailRegisterRequest();
        request.setEmail(email);
        request.setPassword(password);
        return request;
    }

    private static EmailAuthController.EmailLoginRequest loginRequest(String email, String password) {
        EmailAuthController.EmailLoginRequest request = new EmailAuthController.EmailLoginRequest();
        request.setEmail(email);
        request.setPassword(password);
        return request;
    }
}
