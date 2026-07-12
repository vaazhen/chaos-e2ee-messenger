package ru.messenger.chaosmessenger.infra.security;

import ru.messenger.chaosmessenger.common.exception.CryptoException;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private static final String TOKEN_TYPE = "access";

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long expiration;

    @Value("${jwt.issuer:chaos-messenger}")
    private String issuer;

    @Value("${jwt.audience:chaos-messenger-api}")
    private String audience;

    @PostConstruct
    public void init() {
        if (secret == null || secret.length() < 32) {
            throw new CryptoException("JWT_SECRET must be at least 32 characters long");
        }
        if (expiration <= 0 || expiration > 3_600_000L) {
            throw new CryptoException("JWT expiration must be between 1 ms and 1 hour");
        }
    }

    private SecretKey getKey() {
        if (secret == null || secret.isBlank()) {
            throw new CryptoException("JWT secret is not configured. Set JWT_SECRET environment variable.");
        }
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(String username) {
        return generateToken(username, UUID.randomUUID().toString());
    }

    public String generateToken(String username, String sessionId) {
        Date issuedAt = new Date();
        return Jwts.builder()
                .issuer(issuer)
                .audience().add(audience).and()
                .subject(username)
                .id(UUID.randomUUID().toString())
                .claim("token_type", TOKEN_TYPE)
                .claim("session_id", sessionId)
                .issuedAt(issuedAt)
                .notBefore(issuedAt)
                .expiration(new Date(issuedAt.getTime() + expiration))
                .signWith(getKey())
                .compact();
    }

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    public boolean isTokenValid(String token, String username) {
        Claims claims = extractAllClaims(token);
        return username != null
                && username.equals(claims.getSubject())
                && issuer.equals(claims.getIssuer())
                && claims.getAudience() != null
                && claims.getAudience().contains(audience)
                && TOKEN_TYPE.equals(claims.get("token_type", String.class))
                && claims.getId() != null
                && !claims.getExpiration().before(new Date());
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getKey())
                .requireIssuer(issuer)
                .requireAudience(audience)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
