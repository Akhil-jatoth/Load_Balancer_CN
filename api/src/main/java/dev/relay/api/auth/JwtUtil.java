package dev.relay.api.auth;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;

import java.util.Date;

public class JwtUtil {
    private static final String SECRET = "relay-super-secret-jwt-key-2026-production-token";
    private static final Algorithm algorithm = Algorithm.HMAC256(SECRET);
    private static final String ISSUER = "relay-control-plane";
    private static final long EXPIRATION_MS = 24 * 60 * 60 * 1000L; // 24 hours

    public static String generateToken(String userId, String email, String role) {
        return JWT.create()
                .withIssuer(ISSUER)
                .withSubject(userId)
                .withClaim("email", email)
                .withClaim("role", role)
                .withIssuedAt(new Date())
                .withExpiresAt(new Date(System.currentTimeMillis() + EXPIRATION_MS))
                .sign(algorithm);
    }

    public static DecodedJWT verifyToken(String token) {
        try {
            JWTVerifier verifier = JWT.require(algorithm)
                    .withIssuer(ISSUER)
                    .build();
            return verifier.verify(token);
        } catch (Exception e) {
            return null;
        }
    }
}
