package ru.messenger.chaosmessenger.infra.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import ru.messenger.chaosmessenger.common.dto.ApiErrorResponse;

import static org.assertj.core.api.Assertions.assertThat;

class JsonAuthenticationEntryPointTest {

    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    private final JsonAuthenticationEntryPoint entryPoint = new JsonAuthenticationEntryPoint(objectMapper);

    @Test
    void commenceWrites401Json() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();

        entryPoint.commence(
                new MockHttpServletRequest(),
                response,
                new InsufficientAuthenticationException("anonymous")
        );

        assertThat(response.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
        assertThat(response.getContentType()).contains("json");
        ApiErrorResponse body = objectMapper.readValue(response.getContentAsByteArray(), ApiErrorResponse.class);
        assertThat(body.status()).isEqualTo(401);
        assertThat(body.error()).isEqualTo("AUTH_ERROR");
        assertThat(body.message()).isEqualTo("Authentication required");
    }

    @Test
    void accessDeniedHandlerWrites403Json() throws Exception {
        JsonAccessDeniedHandler handler = new JsonAccessDeniedHandler(entryPoint);
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.handle(
                new MockHttpServletRequest(),
                response,
                new org.springframework.security.access.AccessDeniedException("no")
        );

        assertThat(response.getStatus()).isEqualTo(HttpStatus.FORBIDDEN.value());
        ApiErrorResponse body = objectMapper.readValue(response.getContentAsByteArray(), ApiErrorResponse.class);
        assertThat(body.error()).isEqualTo("FORBIDDEN");
    }
}
