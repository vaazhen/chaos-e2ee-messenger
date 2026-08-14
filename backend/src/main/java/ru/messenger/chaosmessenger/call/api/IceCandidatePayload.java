package ru.messenger.chaosmessenger.call.api;

public record IceCandidatePayload(
        String candidate,
        String sdpMid,
        Integer sdpMLineIndex,
        String usernameFragment
) {
}
