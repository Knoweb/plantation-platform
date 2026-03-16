package com.knoweb.tenant.config;

import com.knoweb.tenant.websocket.WorkProgramWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final WorkProgramWebSocketHandler workProgramWebSocketHandler;

    public WebSocketConfig(WorkProgramWebSocketHandler workProgramWebSocketHandler) {
        this.workProgramWebSocketHandler = workProgramWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(workProgramWebSocketHandler, "/ws/work-program")
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
