package ru.messenger.chaosmessenger.call.api;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import ru.messenger.chaosmessenger.call.CallAuthorizationService;

import java.security.Principal;
import java.util.Map;

@Slf4j
@Controller
@RequiredArgsConstructor
public class CallSignalingController {

    private final SimpMessagingTemplate messagingTemplate;
    private final CallAuthorizationService callAuthorizationService;

    @MessageMapping("/call.offer")
    public void handleOffer(@Payload Map<String, Object> payload, Principal principal) {
        String targetUsername = (String) payload.get("targetUsername");
        String chatId = String.valueOf(payload.get("chatId"));
        String sdp = (String) payload.get("sdp");

        String username = principal != null ? principal.getName() : "unknown";

        if (!callAuthorizationService.isCallAllowed(username, targetUsername)) {
            return;
        }

        Map<String, Object> message = Map.of(
                "type", "CALL_OFFER",
                "fromUsername", username,
                "chatId", chatId,
                "sdp", sdp
        );

        messagingTemplate.convertAndSend("/topic/users/" + targetUsername + "/calls", message);
        log.debug("Call offer from {} to user {}", username, targetUsername);
    }

    @MessageMapping("/call.answer")
    public void handleAnswer(@Payload Map<String, Object> payload, Principal principal) {
        String targetUsername = (String) payload.get("targetUsername");
        String chatId = String.valueOf(payload.get("chatId"));
        String sdp = (String) payload.get("sdp");

        String username = principal != null ? principal.getName() : "unknown";

        if (!callAuthorizationService.isCallAllowed(username, targetUsername)) {
            return;
        }

        Map<String, Object> message = Map.of(
                "type", "CALL_ANSWER",
                "fromUsername", username,
                "chatId", chatId,
                "sdp", sdp
        );

        messagingTemplate.convertAndSend("/topic/users/" + targetUsername + "/calls", message);
    }

    @MessageMapping("/call.ice-candidate")
    public void handleIceCandidate(@Payload Map<String, Object> payload, Principal principal) {
        String targetUsername = (String) payload.get("targetUsername");
        String chatId = String.valueOf(payload.get("chatId"));
        String candidate = (String) payload.get("candidate");
        String mid = (String) payload.get("mid");

        String username = principal != null ? principal.getName() : "unknown";

        if (!callAuthorizationService.isCallAllowed(username, targetUsername)) {
            return;
        }

        Map<String, Object> message = Map.of(
                "type", "ICE_CANDIDATE",
                "fromUsername", username,
                "chatId", chatId,
                "candidate", candidate,
                "mid", mid
        );

        messagingTemplate.convertAndSend("/topic/users/" + targetUsername + "/calls", message);
    }

    @MessageMapping("/call.end")
    public void handleEnd(@Payload Map<String, Object> payload, Principal principal) {
        String targetUsername = (String) payload.get("targetUsername");
        String chatId = String.valueOf(payload.get("chatId"));

        String username = principal != null ? principal.getName() : "unknown";

        if (!callAuthorizationService.isCallAllowed(username, targetUsername)) {
            return;
        }

        Map<String, Object> message = Map.of(
                "type", "CALL_END",
                "fromUsername", username,
                "chatId", chatId
        );

        messagingTemplate.convertAndSend("/topic/users/" + targetUsername + "/calls", message);
    }

}
