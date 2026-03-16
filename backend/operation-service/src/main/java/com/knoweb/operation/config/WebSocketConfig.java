package com.knoweb.operation.config;

import com.knoweb.operation.websocket.DistributionWorksWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final DistributionWorksWebSocketHandler distributionWorksWebSocketHandler;

    public WebSocketConfig(DistributionWorksWebSocketHandler distributionWorksWebSocketHandler) {
        this.distributionWorksWebSocketHandler = distributionWorksWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(distributionWorksWebSocketHandler, "/ws/distribution-works")
                .setAllowedOrigins(
                        "http://localhost:5173",
                        "http://localhost:3000",
                        "http://localhost:8080",
                        "https://www.wevili.com",
                        "http://www.wevili.com",
                        "https://wevili.com",
                        "http://wevili.com"
                );
    }
}
