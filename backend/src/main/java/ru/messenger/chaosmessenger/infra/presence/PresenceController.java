package ru.messenger.chaosmessenger.infra.presence;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;
import ru.messenger.chaosmessenger.infra.ws.WebSocketAuthChannelInterceptor;

@Slf4j
@Controller
@RequiredArgsConstructor
public class PresenceController {

    private final OnlineService onlineService;
    private final WebSocketAuthChannelInterceptor authInterceptor;

    @MessageMapping("/user.online")
    public void userOnline(@Header("simpSessionId") String sessionId) {
        String username = authInterceptor.getUsernameBySessionId(sessionId);

        if (username == null) {
            log.warn("No username found for sessionId: {}", sessionId);
            return;
        }

        log.debug("Presence heartbeat received from user={} sessionId={}", username, sessionId);
        onlineService.refreshSession(username, sessionId);
    }

    @MessageMapping("/user.offline")
    public void userOffline(@Header("simpSessionId") String sessionId) {
        String username = authInterceptor.getUsernameBySessionId(sessionId);

        if (username == null) {
            return;
        }

        log.debug("Client requested offline for user={} sessionId={}; disconnect event owns offline transition", username, sessionId);
    }
}
