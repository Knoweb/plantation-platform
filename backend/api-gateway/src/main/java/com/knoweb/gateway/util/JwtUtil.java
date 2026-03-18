package com.knoweb.gateway.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

@Component
public class JwtUtil {

    // EXACT SAME SECRET KEY AS IN TENANT-SERVICE!
    private static final String SECRET_STRING = "MySuperSecretKeyForPlantationPlatform12345!";
    private static final SecretKey SECRET_KEY = Keys.hmacShaKeyFor(SECRET_STRING.getBytes(StandardCharsets.UTF_8));

    public Claims getClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(SECRET_KEY)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public boolean isInvalid(String token) {
        try {
            getClaims(token);
            return false;
        } catch (Exception e) {
            return true;
        }
    }
}
