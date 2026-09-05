package ru.messenger.chaosmessenger.infra.ws;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.WebSocketHandlerDecorator;
import org.springframework.web.socket.handler.WebSocketHandlerDecoratorFactory;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class WebSocketNativeSessionTracker implements WebSocketHandlerDecoratorFactory {

    private final ConcurrentHashMap<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    @Override
    public WebSocketHandler decorate(WebSocketHandler handler) {
        return new WebSocketHandlerDecorator(handler) {
            @Override
            public void afterConnectionEstablished(WebSocketSession session) throws Exception {
                sessions.put(session.getId(), session);
                super.afterConnectionEstablished(session);
            }

            @Override
            public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
                sessions.remove(session.getId());
                super.afterConnectionClosed(session, status);
            }
        };
    }

    public void close(String sessionId) {
        WebSocketSession session = sessions.remove(sessionId);
        if (session == null || !session.isOpen()) {
            return;
        }
        try {
            session.close(CloseStatus.POLICY_VIOLATION);
        } catch (IOException ignored) {
            // Best-effort close after logout.
        }
    }
}
