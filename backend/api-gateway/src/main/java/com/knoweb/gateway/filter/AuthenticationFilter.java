package com.knoweb.gateway.filter;

import com.knoweb.gateway.util.JwtUtil;
import io.jsonwebtoken.Claims;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.function.Predicate;

@Component
public class AuthenticationFilter extends AbstractGatewayFilterFactory<AuthenticationFilter.Config> {

    private final JwtUtil jwtUtil;

    public AuthenticationFilter(JwtUtil jwtUtil) {
        super(Config.class);
        this.jwtUtil = jwtUtil;
    }

    public static class Config {
        // configuration properties would go here
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();

            // 1. WHICH PATHS SHOULD WE IGNORE? (e.g., login, sign up)
            final List<String> openApiEndpoints = List.of(
                    "/api/tenants/login",
                    "/api/tenants", // Allow tenant creation
                    "/fallback"
            );

            Predicate<ServerHttpRequest> isApiSecured = r -> openApiEndpoints.stream()
                    .noneMatch(uri -> r.getURI().getPath().contains(uri));

            if (isApiSecured.test(request)) {
                // 2. CHECK IF AUTHORIZATION HEADER EXISTS
                if (!request.getHeaders().containsKey(HttpHeaders.AUTHORIZATION)) {
                    return onError(exchange, "Missing authorization header", HttpStatus.UNAUTHORIZED);
                }

                // 3. GET THE TOKEN
                String authHeader = request.getHeaders().get(HttpHeaders.AUTHORIZATION).get(0);
                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    authHeader = authHeader.substring(7);
                } else {
                    return onError(exchange, "Invalid authorization header format", HttpStatus.UNAUTHORIZED);
                }

                // 4. VALIDATE THE TOKEN
                try {
                    if (jwtUtil.isInvalid(authHeader)) {
                        return onError(exchange, "Unauthorized access to application", HttpStatus.UNAUTHORIZED);
                    }

                    // 5. EXTRACT CLAIMS AND PASS THEM DOWN TO MICROSERVICES (OPTIONAL BUT USEFUL)
                    Claims claims = jwtUtil.getClaims(authHeader);
                    
                    // We can embed the user's role directly into a hardcoded non-spoofable internal header
                    // So `tenant-service` or `operation-service` knows EXACTLY who is making the request
                    exchange.getRequest().mutate()
                            .header("X-Auth-UserId", claims.get("userId", String.class))
                            .header("X-Auth-Role", claims.get("role", String.class))
                            .header("X-Auth-TenantId", claims.get("tenantId", String.class))
                            .build();

                } catch (Exception e) {
                    return onError(exchange, "Unauthorized access to application: " + e.getMessage(), HttpStatus.UNAUTHORIZED);
                }
            }
            return chain.filter(exchange);
        };
    }

    private Mono<Void> onError(ServerWebExchange exchange, String err, HttpStatus httpStatus) {
        exchange.getResponse().setStatusCode(httpStatus);
        return exchange.getResponse().setComplete();
    }
}
