package com.knoweb.tenant.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
public class JwtUtil {

    // In a real app, this should be in an environment variable/application.yml!
    // Must be at least 256 bits (32 characters).
    private static final String SECRET_STRING = "MySuperSecretKeyForPlantationPlatform12345!";
    private static final SecretKey SECRET_KEY = Keys.hmacShaKeyFor(SECRET_STRING.getBytes(StandardCharsets.UTF_8));
    
    // 24 hours in milliseconds
    private static final long EXPIRATION_TIME = 86400000;

    public String generateToken(UUID userId, String username, String role, UUID tenantId) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role);
        claims.put("tenantId", tenantId != null ? tenantId.toString() : null);
        claims.put("userId", userId != null ? userId.toString() : null);

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(username)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(SECRET_KEY, SignatureAlgorithm.HS256)
                .compact();
    }
}
