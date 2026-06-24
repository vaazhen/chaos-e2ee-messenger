package ru.messenger.chaosmessenger.infra.ws;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import ru.messenger.chaosmessenger.infra.presence.OnlineService;
import ru.messenger.chaosmessenger.infra.presence.UserStatusEvent;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final OnlineService onlineService;
    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void handleConnect(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());

        if (accessor.getUser() != null) {
            String username = accessor.getUser().getName();
            String sessionId = accessor.getSessionId();

            log.info("USER CONNECTED: {} sessionId={}", username, sessionId);

            if (onlineService.markSessionOnline(username, sessionId)) {
                messagingTemplate.convertAndSend("/topic/user/status",
                        new UserStatusEvent(username, "ONLINE", System.currentTimeMillis()));
            }
        }
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());

        if (accessor.getUser() != null) {
            String username = accessor.getUser().getName();
            String sessionId = accessor.getSessionId();

            log.info("USER DISCONNECTED: {} sessionId={}", username, sessionId);

            if (onlineService.markSessionOffline(username, sessionId)) {
                messagingTemplate.convertAndSend("/topic/user/status",
                        new UserStatusEvent(username, "OFFLINE", System.currentTimeMillis()));
            }
        }
    }
}
