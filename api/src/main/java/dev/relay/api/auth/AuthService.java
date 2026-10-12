package dev.relay.api.auth;

import dev.relay.api.db.DatabaseManager;
import org.mindrot.jbcrypt.BCrypt;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public class AuthService {
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private final DatabaseManager db;

    public AuthService(DatabaseManager db) {
        this.db = db;
    }

    public static class User {
        public String id;
        public String name;
        public String email;
        public String role;
        public long createdAt;

        public User(String id, String name, String email, String role, long createdAt) {
            this.id = id;
            this.name = name;
            this.email = email;
            this.role = role;
            this.createdAt = createdAt;
        }
    }

    public Map<String, Object> register(String name, String email, String password) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Full name is required");
        }
        if (email == null || !email.matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
            throw new IllegalArgumentException("Valid email address is required");
        }
        if (password == null || password.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters long");
        }

        String normalizedEmail = email.trim().toLowerCase();

        try (Connection conn = db.getConnection()) {
            // Check existing
            String checkSql = "SELECT id FROM users WHERE email = ?";
            try (PreparedStatement ps = conn.prepareStatement(checkSql)) {
                ps.setString(1, normalizedEmail);
                ResultSet rs = ps.executeQuery();
                if (rs.next()) {
                    throw new IllegalArgumentException("An account with this email already exists");
                }
            }

            String userId = "u_" + UUID.randomUUID().toString().substring(0, 8);
            String hash = BCrypt.hashpw(password, BCrypt.gensalt(10));
            long now = System.currentTimeMillis();

            String insertSql = "INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, 'admin', ?)";
            try (PreparedStatement ps = conn.prepareStatement(insertSql)) {
                ps.setString(1, userId);
                ps.setString(2, name.trim());
                ps.setString(3, normalizedEmail);
                ps.setString(4, hash);
                ps.setLong(5, now);
                ps.executeUpdate();
            }

            User user = new User(userId, name.trim(), normalizedEmail, "admin", now);
            String token = JwtUtil.generateToken(userId, normalizedEmail, "admin");

            Map<String, Object> res = new HashMap<>();
            res.put("user", user);
            res.put("token", token);
            return res;
        } catch (SQLException e) {
            log.error("Register database error: {}", e.getMessage(), e);
            throw new RuntimeException("Database error during registration");
        }
    }

    public Map<String, Object> login(String email, String password) {
        if (email == null || password == null) {
            throw new IllegalArgumentException("Email and password are required");
        }

        String normalizedEmail = email.trim().toLowerCase();

        try (Connection conn = db.getConnection()) {
            String sql = "SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = ?";
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, normalizedEmail);
                ResultSet rs = ps.executeQuery();
                if (!rs.next()) {
                    throw new IllegalArgumentException("Invalid email or password");
                }

                String id = rs.getString("id");
                String name = rs.getString("name");
                String hash = rs.getString("password_hash");
                String role = rs.getString("role");
                long createdAt = rs.getLong("created_at");

                if (!BCrypt.checkpw(password, hash)) {
                    throw new IllegalArgumentException("Invalid email or password");
                }

                User user = new User(id, name, normalizedEmail, role, createdAt);
                String token = JwtUtil.generateToken(id, normalizedEmail, role);

                Map<String, Object> res = new HashMap<>();
                res.put("user", user);
                res.put("token", token);
                return res;
            }
        } catch (SQLException e) {
            log.error("Login database error: {}", e.getMessage(), e);
            throw new RuntimeException("Database error during login");
        }
    }

    public User getUserById(String id) {
        if (id == null) return null;
        try (Connection conn = db.getConnection()) {
            String sql = "SELECT id, name, email, role, created_at FROM users WHERE id = ?";
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, id);
                ResultSet rs = ps.executeQuery();
                if (rs.next()) {
                    return new User(
                            rs.getString("id"),
                            rs.getString("name"),
                            rs.getString("email"),
                            rs.getString("role"),
                            rs.getLong("created_at")
                    );
                }
            }
        } catch (SQLException e) {
            log.error("Find user error: {}", e.getMessage());
        }
        return null;
    }

    public void updatePassword(String userId, String currentPassword, String newPassword) {
        if (newPassword == null || newPassword.length() < 8) {
            throw new IllegalArgumentException("New password must be at least 8 characters long");
        }
        try (Connection conn = db.getConnection()) {
            String sql = "SELECT password_hash FROM users WHERE id = ?";
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, userId);
                ResultSet rs = ps.executeQuery();
                if (!rs.next()) {
                    throw new IllegalArgumentException("User not found");
                }
                String currentHash = rs.getString("password_hash");
                if (!BCrypt.checkpw(currentPassword, currentHash)) {
                    throw new IllegalArgumentException("Incorrect current password");
                }
            }

            String updateSql = "UPDATE users SET password_hash = ? WHERE id = ?";
            try (PreparedStatement ps = conn.prepareStatement(updateSql)) {
                ps.setString(1, BCrypt.hashpw(newPassword, BCrypt.gensalt(10)));
                ps.setString(2, userId);
                ps.executeUpdate();
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to update password");
        }
    }
}
