package ru.messenger.chaosmessenger.common.exception;

public class AuthException extends RuntimeException {

    private final String code;

    public AuthException(String message) {
        this(message, "AUTH_ERROR");
    }

    public AuthException(String message, String code) {
        super(message);
        this.code = code == null || code.isBlank() ? "AUTH_ERROR" : code;
    }

    public String getCode() {
        return code;
    }
}
