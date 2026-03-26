package com.knoweb.tenant.config;

import com.knoweb.tenant.websocket.WorkProgramWebSocketHandler;
import com.knoweb.tenant.websocket.WorkerWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final WorkProgramWebSocketHandler workProgramWebSocketHandler;
    private final WorkerWebSocketHandler workerWebSocketHandler;

    public WebSocketConfig(WorkProgramWebSocketHandler workProgramWebSocketHandler, 
                           WorkerWebSocketHandler workerWebSocketHandler) {
        this.workProgramWebSocketHandler = workProgramWebSocketHandler;
        this.workerWebSocketHandler = workerWebSocketHandler;
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

        registry.addHandler(workProgramWebSocketHandler, "/ws/work-program")
                .setAllowedOrigins(allowedOrigins);

        registry.addHandler(workerWebSocketHandler, "/ws/workers")
                .setAllowedOrigins(allowedOrigins);
    }
}
