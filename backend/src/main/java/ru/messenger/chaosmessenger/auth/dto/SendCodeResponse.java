package ru.messenger.chaosmessenger.auth.dto;

public record SendCodeResponse(boolean sent, String phone) {
}
