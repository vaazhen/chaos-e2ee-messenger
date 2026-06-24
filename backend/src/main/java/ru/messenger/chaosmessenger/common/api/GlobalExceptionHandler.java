package ru.messenger.chaosmessenger.common.api;

import lombok.extern.slf4j.Slf4j;
import ru.messenger.chaosmessenger.common.exception.*;

import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.beans.TypeMismatchException;
import jakarta.validation.ConstraintViolationException;
import java.util.stream.Collectors;
import ru.messenger.chaosmessenger.common.dto.ApiErrorResponse;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.NoSuchElementException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    private final MessageSource messageSource;

    public GlobalExceptionHandler(MessageSource messageSource) {
        this.messageSource = messageSource;
    }

    private String localize(String code, Object[] args, String defaultMessage) {
        Locale locale = LocaleContextHolder.getLocale();
        return messageSource.getMessage(code, args, defaultMessage, locale);
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(NoSuchElementException ex) {
        log.warn("Resource not found: {}", ex.getMessage());
        String code = "NOT_FOUND";
        String message = localize(code, new Object[]{ex.getMessage()}, "Entity not found");
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ApiErrorResponse(
                        HttpStatus.NOT_FOUND.value(),
                        code,
                        message,
                        LocalDateTime.now()
                ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleBadRequest(IllegalArgumentException ex) {
        log.warn("Bad request: {}", ex.getMessage());
        String code = "BAD_REQUEST";
        String message = localize(code, new Object[]{ex.getMessage()}, "Bad request");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiErrorResponse(
                        HttpStatus.BAD_REQUEST.value(),
                        code,
                        message,
                        LocalDateTime.now()
                ));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiErrorResponse> handleConflict(IllegalStateException ex) {
        log.warn("Conflict: {}", ex.getMessage());
        String code = "CONFLICT";
        String message = localize(code, new Object[]{ex.getMessage()}, "Conflict occurred");
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ApiErrorResponse(
                        HttpStatus.CONFLICT.value(),
                        code,
                        message,
                        LocalDateTime.now()
                ));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        log.warn("Data integrity violation: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ApiErrorResponse(
                        HttpStatus.CONFLICT.value(),
                        "CONFLICT",
                        "Data integrity conflict",
                        LocalDateTime.now()
                ));
    }

    @ExceptionHandler(AuthException.class)
    public ResponseEntity<ApiErrorResponse> handleAuth(AuthException ex) {
        log.warn("Auth error: {}", ex.getMessage());
        String code = "AUTH_ERROR";
        String message = localize(code, new Object[]{ex.getMessage()}, ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ApiErrorResponse(HttpStatus.UNAUTHORIZED.value(), code, message, LocalDateTime.now()));
    }

    @ExceptionHandler(RateLimitException.class)
    public ResponseEntity<ApiErrorResponse> handleRateLimit(RateLimitException ex) {
        log.warn("Rate limit exceeded: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header("Retry-After", String.valueOf(ex.getRetryAfterSeconds()))
                .body(new ApiErrorResponse(
                        HttpStatus.TOO_MANY_REQUESTS.value(),
                        "RATE_LIMIT_EXCEEDED",
                        ex.getMessage(),
                        LocalDateTime.now()
                ));
    }

    @ExceptionHandler(ChatException.class)
    public ResponseEntity<ApiErrorResponse> handleChatException(ChatException ex) {
        log.warn("Chat error: {}", ex.getMessage());
        String code = "CHAT_ERROR";
        String message = localize(code, new Object[]{ex.getMessage()}, ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiErrorResponse(HttpStatus.BAD_REQUEST.value(), code, message, LocalDateTime.now()));
    }

    @ExceptionHandler(MessageException.class)
    public ResponseEntity<ApiErrorResponse> handleMessageException(MessageException ex) {
        log.warn("Message error: {}", ex.getMessage());
        String code = "MESSAGE_ERROR";
        String message = localize(code, new Object[]{ex.getMessage()}, ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ApiErrorResponse(HttpStatus.CONFLICT.value(), code, message, LocalDateTime.now()));
    }

    @ExceptionHandler(CryptoException.class)
    public ResponseEntity<ApiErrorResponse> handleCryptoException(CryptoException ex) {
        log.error("Crypto error", ex);
        String code = "CRYPTO_ERROR";
        String message = localize(code, new Object[]{ex.getMessage()}, ex.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR.value(), code, message, LocalDateTime.now()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleForbidden(AccessDeniedException ex) {
        log.warn("Access denied: {}", ex.getMessage());
        String code = "FORBIDDEN";
        String message = localize(code, null, "Access is denied");
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ApiErrorResponse(
                        HttpStatus.FORBIDDEN.value(),
                        code,
                        message,
                        LocalDateTime.now()
                ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining("; "));
        if (message.isBlank()) message = "Validation failed";
        log.warn("Validation failed: {}", message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiErrorResponse(HttpStatus.BAD_REQUEST.value(), "VALIDATION_ERROR", message, LocalDateTime.now()));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleConstraintViolation(ConstraintViolationException ex) {
        String message = ex.getConstraintViolations().stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .collect(Collectors.joining("; "));
        if (message.isBlank()) message = "Validation failed";
        log.warn("Constraint violation: {}", message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiErrorResponse(HttpStatus.BAD_REQUEST.value(), "VALIDATION_ERROR", message, LocalDateTime.now()));
    }


    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<ApiErrorResponse> handleMissingHeader(MissingRequestHeaderException ex) {
        log.warn("Missing request header: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiErrorResponse(
                        HttpStatus.BAD_REQUEST.value(),
                        "BAD_REQUEST",
                        ex.getMessage(),
                        LocalDateTime.now()
                ));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleMessageNotReadable(HttpMessageNotReadableException ex) {
        log.warn("Malformed request body: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiErrorResponse(
                        HttpStatus.BAD_REQUEST.value(),
                        "BAD_REQUEST",
                        "Malformed request body",
                        LocalDateTime.now()
                ));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiErrorResponse> handleMissingParam(MissingServletRequestParameterException ex) {
        log.warn("Missing request parameter: {}", ex.getParameterName());
        String message = "Required parameter '" + ex.getParameterName() + "' is missing";
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiErrorResponse(
                        HttpStatus.BAD_REQUEST.value(),
                        "BAD_REQUEST",
                        message,
                        LocalDateTime.now()
                ));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiErrorResponse> handleMediaTypeNotSupported(HttpMediaTypeNotSupportedException ex) {
        log.warn("Media type not supported: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                .body(new ApiErrorResponse(
                        HttpStatus.UNSUPPORTED_MEDIA_TYPE.value(),
                        "UNSUPPORTED_MEDIA_TYPE",
                        ex.getMessage(),
                        LocalDateTime.now()
                ));
    }

    @ExceptionHandler(TypeMismatchException.class)
    public ResponseEntity<ApiErrorResponse> handleTypeMismatch(TypeMismatchException ex) {
        log.warn("Type mismatch: {}", ex.getMessage());
        String message = "Invalid value for parameter '" + ex.getPropertyName() + "'";
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiErrorResponse(
                        HttpStatus.BAD_REQUEST.value(),
                        "BAD_REQUEST",
                        message,
                        LocalDateTime.now()
                ));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiErrorResponse> handleResponseStatus(ResponseStatusException ex) {
        log.warn("Response status: {} - {}", ex.getStatusCode(), ex.getReason());
        HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
        if (status == null) status = HttpStatus.INTERNAL_SERVER_ERROR;
        String message = ex.getReason() == null || ex.getReason().isBlank()
                ? status.getReasonPhrase()
                : ex.getReason();
        return ResponseEntity.status(status)
                .body(new ApiErrorResponse(status.value(), status.name(), message, LocalDateTime.now()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleOther(Exception ex) {
        log.error("Unhandled exception", ex);
        String code = "INTERNAL_SERVER_ERROR";
        String message = localize(code, null, "Internal server error");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiErrorResponse(
                        HttpStatus.INTERNAL_SERVER_ERROR.value(),
                        code,
                        message,
                        LocalDateTime.now()
                ));
    }
}
