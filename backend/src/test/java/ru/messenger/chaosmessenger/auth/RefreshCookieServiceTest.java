package ru.messenger.chaosmessenger.auth;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;
import ru.messenger.chaosmessenger.auth.service.RefreshCookieService;

import static org.assertj.core.api.Assertions.assertThat;

class RefreshCookieServiceTest {

    @Test
    void writesHostOnlyHttpOnlySecureStrictCookie() {
        RefreshCookieService service = service();
        MockHttpServletResponse response = new MockHttpServletResponse();

        service.write(response, "refresh-secret");

        String header = response.getHeader("Set-Cookie");
        assertThat(header)
                .contains("__Host-chaos_refresh=refresh-secret")
                .contains("Path=/")
                .contains("Secure")
                .contains("HttpOnly")
                .contains("SameSite=Strict")
                .doesNotContain("Domain=");
    }

    @Test
    void cookieValueWinsOverLegacyBodyFallback() {
        RefreshCookieService service = service();
        assertThat(service.resolve("body-token", "cookie-token")).isEqualTo("cookie-token");
        assertThat(service.resolve("body-token", null)).isEqualTo("body-token");
    }

    @Test
    void clearExpiresCookie() {
        RefreshCookieService service = service();
        MockHttpServletResponse response = new MockHttpServletResponse();

        service.clear(response);

        assertThat(response.getHeader("Set-Cookie"))
                .contains("__Host-chaos_refresh=")
                .contains("Max-Age=0")
                .contains("Path=/");
    }

    @Test
    void writesNonHostCookieWithoutSecureWhenLocalHttpIsEnabled() {
        RefreshCookieService service = service();
        ReflectionTestUtils.setField(service, "secure", false);
        MockHttpServletResponse response = new MockHttpServletResponse();

        service.write(response, "refresh-secret");

        String header = response.getHeader("Set-Cookie");
        assertThat(header)
                .contains("chaos_refresh=refresh-secret")
                .doesNotContain("__Host-chaos_refresh=")
                .contains("Path=/")
                .contains("HttpOnly")
                .contains("SameSite=Strict")
                .doesNotContain("Secure")
                .doesNotContain("Domain=");
    }

    @Test
    void hostCookieWinsOverLocalCookieAndBody() {
        RefreshCookieService service = service();
        assertThat(service.resolve("body-token", "host-token", "local-token")).isEqualTo("host-token");
        assertThat(service.resolve("body-token", null, "local-token")).isEqualTo("local-token");
        assertThat(service.resolve("body-token", null, null)).isEqualTo("body-token");
    }

    private static RefreshCookieService service() {
        RefreshCookieService service = new RefreshCookieService();
        ReflectionTestUtils.setField(service, "sameSite", "Strict");
        ReflectionTestUtils.setField(service, "secure", true);
        return service;
    }
}
