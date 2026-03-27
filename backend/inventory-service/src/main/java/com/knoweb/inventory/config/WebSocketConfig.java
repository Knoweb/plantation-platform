package com.knoweb.inventory.config;

import com.knoweb.inventory.websocket.InventoryWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final InventoryWebSocketHandler inventoryWebSocketHandler;

    public WebSocketConfig(InventoryWebSocketHandler inventoryWebSocketHandler) {
        this.inventoryWebSocketHandler = inventoryWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // Shared origins for all handlers
        String[] allowedOrigins = {
                "http://localhost:5173",
                "http://localhost:3000",
                "http://localhost:8080",
                "https://www.wevili.com",
                "http://www.wevili.com",
                "https://wevili.com",
                "http://wevili.com"
        };

        registry.addHandler(inventoryWebSocketHandler, "/ws/inventory")
                .setAllowedOrigins(allowedOrigins);
    }
}
