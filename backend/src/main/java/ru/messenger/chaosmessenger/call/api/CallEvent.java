package ru.messenger.chaosmessenger.call.api;

import java.util.List;
import java.util.Map;

public record CallEvent(
        String type,
        Long chatId,
        String fromUsername,
        String fromDeviceId,
        String sdp,
        IceCandidatePayload candidate,
        Boolean video,
        List<Map<String, Object>> mediaKeys
) {
}
