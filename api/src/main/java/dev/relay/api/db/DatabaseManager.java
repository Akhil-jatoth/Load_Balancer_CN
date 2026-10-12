package dev.relay.api.db;

import dev.relay.core.model.Backend;
import dev.relay.core.model.RoutingRule;
import org.mindrot.jbcrypt.BCrypt;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class DatabaseManager {
    private static final Logger log = LoggerFactory.getLogger(DatabaseManager.class);
    private final String dbUrl;

    public DatabaseManager() {
        this("jdbc:sqlite:relay.db");
    }

    public DatabaseManager(String dbUrl) {
        this.dbUrl = dbUrl;
    }

    public Connection getConnection() throws SQLException {
        return DriverManager.getConnection(dbUrl);
    }

    public void init() {
        try (Connection conn = getConnection(); Statement stmt = conn.createStatement()) {
            // Users table
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'admin',
                    created_at INTEGER NOT NULL
                );
            """);

            // Backends table
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS backends (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    host TEXT NOT NULL,
                    port INTEGER NOT NULL,
                    pool TEXT NOT NULL,
                    weight INTEGER NOT NULL DEFAULT 1,
                    enabled INTEGER NOT NULL DEFAULT 1
                );
            """);

            // Rules table
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS rules (
                    id TEXT PRIMARY KEY,
                    path_prefix TEXT NOT NULL,
                    target_pool TEXT NOT NULL,
                    priority INTEGER NOT NULL,
                    enabled INTEGER NOT NULL DEFAULT 1
                );
            """);

            // Settings table
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
            """);

            // Logs / Historical Events table
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS logs (
                    id TEXT PRIMARY KEY,
                    timestamp INTEGER NOT NULL,
                    type TEXT NOT NULL,
                    client_ip TEXT,
                    method TEXT,
                    path TEXT,
                    pool TEXT,
                    backend_name TEXT,
                    backend_port INTEGER,
                    status_code INTEGER,
                    latency_ms INTEGER,
                    bytes_in INTEGER,
                    bytes_out INTEGER,
                    details TEXT
                );
            """);

            seedDefaults(conn);
            log.info("Database initialized successfully at {}", dbUrl);
        } catch (SQLException e) {
            log.error("Failed to initialize database: {}", e.getMessage(), e);
            throw new RuntimeException(e);
        }
    }

    private void seedDefaults(Connection conn) throws SQLException {
        // Seed demo user: demo@relay.dev / Demo@1234
        String checkUserSql = "SELECT COUNT(*) FROM users WHERE email = ?";
        try (PreparedStatement ps = conn.prepareStatement(checkUserSql)) {
            ps.setString(1, "demo@relay.dev");
            ResultSet rs = ps.executeQuery();
            if (rs.next() && rs.getInt(1) == 0) {
                String hash = BCrypt.hashpw("Demo@1234", BCrypt.gensalt(10));
                String insertUser = "INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)";
                try (PreparedStatement ins = conn.prepareStatement(insertUser)) {
                    ins.setString(1, "u_demo_1");
                    ins.setString(2, "Demo Operator");
                    ins.setString(3, "demo@relay.dev");
                    ins.setString(4, hash);
                    ins.setString(5, "admin");
                    ins.setLong(6, System.currentTimeMillis());
                    ins.executeUpdate();
                    log.info("Seeded demo user: demo@relay.dev");
                }
            }
        }

        // Seed 4 Demo Backends if empty
        String checkBackends = "SELECT COUNT(*) FROM backends";
        try (Statement s = conn.createStatement(); ResultSet rs = s.executeQuery(checkBackends)) {
            if (rs.next() && rs.getInt(1) == 0) {
                String insertB = "INSERT INTO backends (id, name, host, port, pool, weight, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)";
                try (PreparedStatement ps = conn.prepareStatement(insertB)) {
                    insertBackend(ps, "b1", "api-service-1", "127.0.0.1", 9001, "api", 1, true);
                    insertBackend(ps, "b2", "api-service-2", "127.0.0.1", 9002, "api", 1, true);
                    insertBackend(ps, "b3", "static-service-1", "127.0.0.1", 9003, "static", 1, true);
                    insertBackend(ps, "b4", "static-service-2", "127.0.0.1", 9004, "static", 1, true);
                    log.info("Seeded 4 demo backends");
                }
            }
        }

        // Seed Default Rules if empty
        String checkRules = "SELECT COUNT(*) FROM rules";
        try (Statement s = conn.createStatement(); ResultSet rs = s.executeQuery(checkRules)) {
            if (rs.next() && rs.getInt(1) == 0) {
                String insertR = "INSERT INTO rules (id, path_prefix, target_pool, priority, enabled) VALUES (?, ?, ?, ?, ?)";
                try (PreparedStatement ps = conn.prepareStatement(insertR)) {
                    insertRule(ps, "r1", "/api", "api", 1, true);
                    insertRule(ps, "r2", "/static", "static", 2, true);
                    log.info("Seeded 2 default routing rules");
                }
            }
        }

        // Seed Default Settings if empty
        String checkSettings = "SELECT COUNT(*) FROM settings";
        try (Statement s = conn.createStatement(); ResultSet rs = s.executeQuery(checkSettings)) {
            if (rs.next() && rs.getInt(1) == 0) {
                String insSetting = "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)";
                try (PreparedStatement ps = conn.prepareStatement(insSetting)) {
                    insertSetting(ps, "rateLimitRps", "20");
                    insertSetting(ps, "healthCheckIntervalSec", "3");
                    insertSetting(ps, "threadPoolSize", "200");
                    insertSetting(ps, "proxyPort", "8080");
                }
            }
        }
    }

    private void insertBackend(PreparedStatement ps, String id, String name, String host, int port, String pool, int weight, boolean enabled) throws SQLException {
        ps.setString(1, id);
        ps.setString(2, name);
        ps.setString(3, host);
        ps.setInt(4, port);
        ps.setString(5, pool);
        ps.setInt(6, weight);
        ps.setInt(7, enabled ? 1 : 0);
        ps.executeUpdate();
    }

    private void insertRule(PreparedStatement ps, String id, String prefix, String pool, int priority, boolean enabled) throws SQLException {
        ps.setString(1, id);
        ps.setString(2, prefix);
        ps.setString(3, pool);
        ps.setInt(4, priority);
        ps.setInt(5, enabled ? 1 : 0);
        ps.executeUpdate();
    }

    private void insertSetting(PreparedStatement ps, String key, String val) throws SQLException {
        ps.setString(1, key);
        ps.setString(2, val);
        ps.executeUpdate();
    }

    public List<Backend> loadBackends() {
        List<Backend> list = new ArrayList<>();
        String sql = "SELECT id, name, host, port, pool, weight, enabled FROM backends";
        try (Connection conn = getConnection(); Statement s = conn.createStatement(); ResultSet rs = s.executeQuery(sql)) {
            while (rs.next()) {
                Backend b = new Backend(
                        rs.getString("id"),
                        rs.getString("name"),
                        rs.getString("host"),
                        rs.getInt("port"),
                        rs.getString("pool")
                );
                b.setWeight(rs.getInt("weight"));
                b.setEnabled(rs.getInt("enabled") == 1);
                list.add(b);
            }
        } catch (SQLException e) {
            log.error("Failed to load backends: {}", e.getMessage());
        }
        return list;
    }

    public List<RoutingRule> loadRules() {
        List<RoutingRule> list = new ArrayList<>();
        String sql = "SELECT id, path_prefix, target_pool, priority, enabled FROM rules ORDER BY priority ASC";
        try (Connection conn = getConnection(); Statement s = conn.createStatement(); ResultSet rs = s.executeQuery(sql)) {
            while (rs.next()) {
                RoutingRule r = new RoutingRule(
                        rs.getString("id"),
                        rs.getString("path_prefix"),
                        rs.getString("target_pool"),
                        rs.getInt("priority")
                );
                r.setEnabled(rs.getInt("enabled") == 1);
                list.add(r);
            }
        } catch (SQLException e) {
            log.error("Failed to load rules: {}", e.getMessage());
        }
        return list;
    }

    public String getSetting(String key, String fallback) {
        String sql = "SELECT value FROM settings WHERE key = ?";
        try (Connection conn = getConnection(); PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, key);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return rs.getString("value");
            }
        } catch (SQLException e) {
            log.error("Failed to get setting {}: {}", key, e.getMessage());
        }
        return fallback;
    }

    public void setSetting(String key, String value) {
        String sql = "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value";
        try (Connection conn = getConnection(); PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, key);
            ps.setString(2, value);
            ps.executeUpdate();
        } catch (SQLException e) {
            log.error("Failed to save setting {}: {}", key, e.getMessage());
        }
    }
}
