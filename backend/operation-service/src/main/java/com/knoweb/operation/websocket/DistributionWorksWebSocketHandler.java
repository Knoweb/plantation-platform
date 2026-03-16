package com.knoweb.operation.websocket;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class DistributionWorksWebSocketHandler extends TextWebSocketHandler {

    private final DistributionRealtimePublisher publisher;

    public DistributionWorksWebSocketHandler(DistributionRealtimePublisher publisher) {
        this.publisher = publisher;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        publisher.register(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        publisher.unregister(session);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        publisher.unregister(session);
        super.handleTransportError(session, exception);
    }
}
