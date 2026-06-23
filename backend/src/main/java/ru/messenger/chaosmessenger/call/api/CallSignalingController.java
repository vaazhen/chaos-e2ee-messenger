package ru.messenger.chaosmessenger.call.api;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import ru.messenger.chaosmessenger.infra.security.DeviceContextHolder;

import java.util.Map;

@Slf4j
@Controller
@RequiredArgsConstructor
public class CallSignalingController {

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/call.offer")
    public void handleOffer(@Payload Map<String, Object> payload, SimpMessageHeaderAccessor headers) {
        String targetDeviceId = (String) payload.get("targetDeviceId");
        String chatId = String.valueOf(payload.get("chatId"));
        String sdp = (String) payload.get("sdp");

        String username = headers.getUser() != null ? headers.getUser().getName() : "unknown";
        String deviceId = DeviceContextHolder.get();

        Map<String, Object> message = Map.of(
                "type", "CALL_OFFER",
                "fromUsername", username,
                "fromDeviceId", deviceId,
                "chatId", chatId,
                "sdp", sdp
        );

        messagingTemplate.convertAndSend("/topic/devices/" + targetDeviceId + "/calls", message);
        log.debug("Call offer from {} to device {}", username, targetDeviceId);
    }

    @MessageMapping("/call.answer")
    public void handleAnswer(@Payload Map<String, Object> payload, SimpMessageHeaderAccessor headers) {
        String targetDeviceId = (String) payload.get("targetDeviceId");
        String chatId = String.valueOf(payload.get("chatId"));
        String sdp = (String) payload.get("sdp");

        String username = headers.getUser() != null ? headers.getUser().getName() : "unknown";
        String deviceId = DeviceContextHolder.get();

        Map<String, Object> message = Map.of(
                "type", "CALL_ANSWER",
                "fromUsername", username,
                "fromDeviceId", deviceId,
                "chatId", chatId,
                "sdp", sdp
        );

        messagingTemplate.convertAndSend("/topic/devices/" + targetDeviceId + "/calls", message);
    }

    @MessageMapping("/call.ice-candidate")
    public void handleIceCandidate(@Payload Map<String, Object> payload, SimpMessageHeaderAccessor headers) {
        String targetDeviceId = (String) payload.get("targetDeviceId");
        String chatId = String.valueOf(payload.get("chatId"));
        String candidate = (String) payload.get("candidate");
        String mid = (String) payload.get("mid");

        String username = headers.getUser() != null ? headers.getUser().getName() : "unknown";
        String deviceId = DeviceContextHolder.get();

        Map<String, Object> message = Map.of(
                "type", "ICE_CANDIDATE",
                "fromUsername", username,
                "fromDeviceId", deviceId,
                "chatId", chatId,
                "candidate", candidate,
                "mid", mid
        );

        messagingTemplate.convertAndSend("/topic/devices/" + targetDeviceId + "/calls", message);
    }

    @MessageMapping("/call.end")
    public void handleEnd(@Payload Map<String, Object> payload, SimpMessageHeaderAccessor headers) {
        String targetDeviceId = (String) payload.get("targetDeviceId");
        String chatId = String.valueOf(payload.get("chatId"));

        String username = headers.getUser() != null ? headers.getUser().getName() : "unknown";
        String deviceId = DeviceContextHolder.get();

        Map<String, Object> message = Map.of(
                "type", "CALL_END",
                "fromUsername", username,
                "fromDeviceId", deviceId,
                "chatId", chatId
        );

        messagingTemplate.convertAndSend("/topic/devices/" + targetDeviceId + "/calls", message);
    }
}
