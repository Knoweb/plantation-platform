package com.knoweb.tenant.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class WorkProgramRealtimePublisher {

    private final Set<WebSocketSession> sessions = ConcurrentHashMap.newKeySet();
    private final ObjectMapper objectMapper;

    public WorkProgramRealtimePublisher(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void register(WebSocketSession session) {
        sessions.add(session);
    }

    public void unregister(WebSocketSession session) {
        sessions.remove(session);
    }

    public void broadcastUpdated(String tenantId, int year, int month) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", "work-program-updated");
        payload.put("tenantId", tenantId);
        payload.put("year", year);
        payload.put("month", month);
        payload.put("occurredAt", LocalDateTime.now(ZoneId.of("Asia/Colombo")).toString());
        broadcast(payload);
    }

    private void broadcast(Map<String, Object> payload) {
        final String message;
        try {
            message = objectMapper.writeValueAsString(payload);
        } catch (IOException e) {
            return;
        }

        sessions.removeIf(session -> !send(session, message));
    }

    private boolean send(WebSocketSession session, String message) {
        if (!session.isOpen()) {
            return false;
        }
        try {
            synchronized (session) {
                session.sendMessage(new TextMessage(message));
            }
            return true;
        } catch (IOException e) {
            return false;
        }
    }
}
