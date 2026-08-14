package ru.messenger.chaosmessenger.call.api;

import java.util.List;
import java.util.Map;

public record CallSignalRequest(
        Long chatId,
        String type,
        String sdp,
        IceCandidatePayload candidate,
        Boolean video,
        List<Map<String, Object>> mediaKeys
) {
}
