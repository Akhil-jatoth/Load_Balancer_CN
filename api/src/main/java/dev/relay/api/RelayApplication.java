package dev.relay.api;

import com.auth0.jwt.interfaces.DecodedJWT;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.relay.api.auth.AuthService;
import dev.relay.api.auth.JwtUtil;
import dev.relay.api.db.DatabaseManager;
import dev.relay.api.metrics.MetricsManager;
import dev.relay.api.traffic.TrafficGenerator;
import dev.relay.api.websocket.LiveWebSocketHandler;
import dev.relay.core.config.ProxyConfig;
import dev.relay.core.engine.RelayProxyServer;
import dev.relay.core.event.EventBus;
import dev.relay.core.model.Backend;
import dev.relay.core.model.BackendStatus;
import dev.relay.core.model.ProxyEvent;
import dev.relay.core.model.RoutingRule;
import dev.relay.demobackends.DemoBackendManager;
import io.javalin.Javalin;
import io.javalin.http.Context;
import io.javalin.http.Cookie;
import io.javalin.http.HttpStatus;
import io.javalin.json.JavalinJackson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

public class RelayApplication {
    private static final Logger log = LoggerFactory.getLogger(RelayApplication.class);
    private static final ObjectMapper mapper = new ObjectMapper();

    public static void main(String[] args) {
        try {
            int apiPort = Integer.parseInt(System.getenv().getOrDefault("API_PORT", "8000"));
            int proxyPort = Integer.parseInt(System.getenv().getOrDefault("PROXY_PORT", "8080"));

            log.info("Starting Relay Control Plane and Engine...");

            // 1. Database
            DatabaseManager db = new DatabaseManager();
            db.init();

            // 2. Demo Backends (9001 - 9004)
            DemoBackendManager backendManager = new DemoBackendManager();
            backendManager.startAll();

            // 3. Core Engine Config
            final ProxyConfig proxyConfig = new ProxyConfig();
            proxyConfig.setPort(proxyPort);
            List<Backend> dbBackends = db.loadBackends();
            if (!dbBackends.isEmpty()) {
                proxyConfig.setBackends(dbBackends);
            } else {
                ProxyConfig def = ProxyConfig.createDefault();
                proxyConfig.setBackends(def.getBackends());
                proxyConfig.setRoutingRules(def.getRoutingRules());
            }

            List<RoutingRule> dbRules = db.loadRules();
            if (!dbRules.isEmpty()) {
                proxyConfig.setRoutingRules(dbRules);
            }

            int rps = Integer.parseInt(db.getSetting("rateLimitRps", "20"));
            int healthSec = Integer.parseInt(db.getSetting("healthCheckIntervalSec", "3"));
            int threadPool = Integer.parseInt(db.getSetting("threadPoolSize", "200"));
            proxyConfig.setRateLimitRps(rps);
            proxyConfig.setHealthCheckIntervalSec(healthSec);
            proxyConfig.setThreadPoolSize(threadPool);

            // 4. Core Relay Engine
            EventBus eventBus = new EventBus();
            RelayProxyServer proxyServer = new RelayProxyServer(proxyConfig, eventBus);
            proxyServer.start();

            // Log persistence to SQLite
            eventBus.addListener(e -> {
                if (e != null) {
                    try (Connection conn = db.getConnection();
                         PreparedStatement ps = conn.prepareStatement(
                                 "INSERT INTO logs (id, timestamp, type, client_ip, method, path, pool, backend_name, backend_port, status_code, latency_ms, bytes_in, bytes_out, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")) {
                        ps.setString(1, e.getId());
                        ps.setLong(2, e.getTimestamp());
                        ps.setString(3, e.getType() != null ? e.getType().name() : "EVENT");
                        ps.setString(4, e.getClientIp());
                        ps.setString(5, e.getMethod());
                        ps.setString(6, e.getPath());
                        ps.setString(7, e.getPool());
                        ps.setString(8, e.getBackendName());
                        ps.setInt(9, e.getBackendPort());
                        ps.setInt(10, e.getStatusCode());
                        ps.setLong(11, e.getLatencyMs());
                        ps.setLong(12, e.getBytesIn());
                        ps.setLong(13, e.getBytesOut());
                        ps.setString(14, e.getDetails());
                        ps.executeUpdate();
                    } catch (Exception ignored) {}
                }
            });

            // 5. Auth and Metrics Services
            AuthService authService = new AuthService(db);
            MetricsManager metricsManager = new MetricsManager(eventBus);
            TrafficGenerator trafficGenerator = new TrafficGenerator("http://127.0.0.1:" + proxyPort);
            LiveWebSocketHandler wsHandler = new LiveWebSocketHandler(eventBus);

            // 6. Javalin Web API Server
            Javalin app = Javalin.create(config -> {
                config.jsonMapper(new JavalinJackson());
                config.http.maxRequestSize = 10_000_000;

                File distDir = new File("web/dist");
                if (!distDir.exists()) {
                    distDir = new File("../web/dist");
                }
                if (distDir.exists()) {
                    final String distPath = distDir.getAbsolutePath();
                    final String indexPath = new File(distDir, "index.html").getAbsolutePath();
                    config.staticFiles.add(staticFiles -> {
                        staticFiles.hostedPath = "/";
                        staticFiles.directory = distPath;
                        staticFiles.location = io.javalin.http.staticfiles.Location.EXTERNAL;
                    });
                    config.spaRoot.addFile("/", indexPath, io.javalin.http.staticfiles.Location.EXTERNAL);
                    log.info("Hosting React Dashboard SPA from: {}", distPath);
                }
            });

            // Universal CORS Filter
            app.before(ctx -> {
                String origin = ctx.header("Origin");
                if (origin != null) {
                    ctx.header("Access-Control-Allow-Origin", origin);
                    ctx.header("Access-Control-Allow-Credentials", "true");
                    ctx.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
                    ctx.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie, X-Requested-With");
                }
            });
            app.options("/*", ctx -> ctx.status(HttpStatus.NO_CONTENT));

            // WebSocket Endpoint
            app.ws("/live", wsHandler::configure);

            // --- Authentication Routes ---
            app.post("/auth/register", ctx -> {
                Map<String, String> body = ctx.bodyAsClass(Map.class);
                try {
                    Map<String, Object> res = authService.register(body.get("name"), body.get("email"), body.get("password"));
                    String token = (String) res.get("token");
                    setAuthCookie(ctx, token);
                    ctx.json(res);
                } catch (IllegalArgumentException e) {
                    ctx.status(HttpStatus.BAD_REQUEST).json(Map.of("error", e.getMessage()));
                }
            });

            app.post("/auth/login", ctx -> {
                Map<String, String> body = ctx.bodyAsClass(Map.class);
                try {
                    Map<String, Object> res = authService.login(body.get("email"), body.get("password"));
                    String token = (String) res.get("token");
                    setAuthCookie(ctx, token);
                    ctx.json(res);
                } catch (IllegalArgumentException e) {
                    ctx.status(HttpStatus.UNAUTHORIZED).json(Map.of("error", e.getMessage()));
                }
            });

            app.post("/auth/logout", ctx -> {
                ctx.removeCookie("relay_token");
                ctx.json(Map.of("message", "Logged out successfully"));
            });

            app.get("/auth/me", ctx -> {
                AuthService.User user = authenticate(ctx, authService);
                if (user == null) {
                    ctx.status(HttpStatus.UNAUTHORIZED).json(Map.of("error", "Unauthorized"));
                    return;
                }
                ctx.json(Map.of("user", user));
            });

            // --- Backends CRUD & Control Routes ---
            app.get("/backends", ctx -> {
                List<Backend> backends = proxyConfig.getBackends();
                List<Map<String, Object>> response = new ArrayList<>();
                for (Backend b : backends) {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", b.getId());
                    m.put("name", b.getName());
                    m.put("host", b.getHost());
                    m.put("port", b.getPort());
                    m.put("pool", b.getPool());
                    m.put("weight", b.getWeight());
                    m.put("enabled", b.isEnabled());
                    m.put("status", b.getStatus().name());
                    m.put("activeConnections", b.getActiveConnections());
                    m.put("totalRequests", b.getTotalRequests());
                    m.put("totalBytesIn", b.getTotalBytesIn());
                    m.put("totalBytesOut", b.getTotalBytesOut());
                    m.put("lastCheckTimestamp", b.getLastCheckTimestamp());
                    m.put("lastResponseTimeMs", b.getLastResponseTimeMs());
                    m.put("isDemoProcessRunning", backendManager.isRunning(b.getId()));
                    response.add(m);
                }
                ctx.json(response);
            });

            app.post("/backends", ctx -> {
                Map<String, Object> body = ctx.bodyAsClass(Map.class);
                String id = (String) body.getOrDefault("id", "b_" + UUID.randomUUID().toString().substring(0, 6));
                String name = (String) body.get("name");
                String host = (String) body.getOrDefault("host", "127.0.0.1");
                int port = ((Number) body.get("port")).intValue();
                String pool = (String) body.getOrDefault("pool", "default");
                int weight = body.get("weight") != null ? ((Number) body.get("weight")).intValue() : 1;

                Backend b = new Backend(id, name, host, port, pool);
                b.setWeight(weight);
                b.setEnabled(true);

                proxyConfig.addBackend(b);
                proxyServer.updateBackends(proxyConfig.getBackends());

                // Persist
                try (Connection conn = db.getConnection();
                     PreparedStatement ps = conn.prepareStatement("INSERT INTO backends (id, name, host, port, pool, weight, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)")) {
                    ps.setString(1, id);
                    ps.setString(2, name);
                    ps.setString(3, host);
                    ps.setInt(4, port);
                    ps.setString(5, pool);
                    ps.setInt(6, weight);
                    ps.setInt(7, 1);
                    ps.executeUpdate();
                }

                ctx.status(HttpStatus.CREATED).json(b);
            });

            app.put("/backends/{id}", ctx -> {
                String id = ctx.pathParam("id");
                Backend b = proxyConfig.findBackendById(id);
                if (b == null) {
                    ctx.status(HttpStatus.NOT_FOUND).json(Map.of("error", "Backend not found"));
                    return;
                }
                Map<String, Object> body = ctx.bodyAsClass(Map.class);
                if (body.containsKey("name")) b.setName((String) body.get("name"));
                if (body.containsKey("host")) b.setHost((String) body.get("host"));
                if (body.containsKey("port")) b.setPort(((Number) body.get("port")).intValue());
                if (body.containsKey("pool")) b.setPool((String) body.get("pool"));
                if (body.containsKey("weight")) b.setWeight(((Number) body.get("weight")).intValue());
                if (body.containsKey("enabled")) b.setEnabled((Boolean) body.get("enabled"));

                // Persist
                try (Connection conn = db.getConnection();
                     PreparedStatement ps = conn.prepareStatement("UPDATE backends SET name = ?, host = ?, port = ?, pool = ?, weight = ?, enabled = ? WHERE id = ?")) {
                    ps.setString(1, b.getName());
                    ps.setString(2, b.getHost());
                    ps.setInt(3, b.getPort());
                    ps.setString(4, b.getPool());
                    ps.setInt(5, b.getWeight());
                    ps.setInt(6, b.isEnabled() ? 1 : 0);
                    ps.setString(7, id);
                    ps.executeUpdate();
                }

                ctx.json(b);
            });

            app.delete("/backends/{id}", ctx -> {
                String id = ctx.pathParam("id");
                proxyConfig.removeBackend(id);
                proxyServer.updateBackends(proxyConfig.getBackends());
                backendManager.stopBackend(id);

                try (Connection conn = db.getConnection();
                     PreparedStatement ps = conn.prepareStatement("DELETE FROM backends WHERE id = ?")) {
                    ps.setString(1, id);
                    ps.executeUpdate();
                }
                ctx.json(Map.of("message", "Backend deleted"));
            });

            // Start & Stop Mock Backends to simulate failure live
            app.post("/backends/{id}/start", ctx -> {
                String id = ctx.pathParam("id");
                boolean started = backendManager.startBackend(id);
                Backend b = proxyConfig.findBackendById(id);
                if (b != null) {
                    // Force an immediate health check round so status turns UP fast
                    new Thread(proxyServer.getHealthChecker()::runCheckRound).start();
                }
                ctx.json(Map.of("success", started, "backendId", id, "running", backendManager.isRunning(id)));
            });

            app.post("/backends/{id}/stop", ctx -> {
                String id = ctx.pathParam("id");
                boolean stopped = backendManager.stopBackend(id);
                Backend b = proxyConfig.findBackendById(id);
                if (b != null) {
                    // Force an immediate health check round so status turns DOWN fast
                    new Thread(proxyServer.getHealthChecker()::runCheckRound).start();
                }
                ctx.json(Map.of("success", stopped, "backendId", id, "running", backendManager.isRunning(id)));
            });

            // --- Routing Rules Routes ---
            app.get("/rules", ctx -> {
                ctx.json(proxyConfig.getRoutingRules());
            });

            app.post("/rules", ctx -> {
                Map<String, Object> body = ctx.bodyAsClass(Map.class);
                String id = (String) body.getOrDefault("id", "r_" + UUID.randomUUID().toString().substring(0, 6));
                String prefix = (String) body.get("pathPrefix");
                String pool = (String) body.get("targetPool");
                int priority = body.get("priority") != null ? ((Number) body.get("priority")).intValue() : proxyConfig.getRoutingRules().size() + 1;

                RoutingRule rule = new RoutingRule(id, prefix, pool, priority);
                proxyConfig.addRule(rule);
                proxyServer.updateRules(proxyConfig.getRoutingRules());

                try (Connection conn = db.getConnection();
                     PreparedStatement ps = conn.prepareStatement("INSERT INTO rules (id, path_prefix, target_pool, priority, enabled) VALUES (?, ?, ?, ?, ?)")) {
                    ps.setString(1, id);
                    ps.setString(2, prefix);
                    ps.setString(3, pool);
                    ps.setInt(4, priority);
                    ps.setInt(5, 1);
                    ps.executeUpdate();
                }

                ctx.status(HttpStatus.CREATED).json(rule);
            });

            app.put("/rules/{id}", ctx -> {
                String id = ctx.pathParam("id");
                List<RoutingRule> rules = proxyConfig.getRoutingRules();
                RoutingRule target = null;
                for (RoutingRule r : rules) {
                    if (id.equals(r.getId())) {
                        target = r;
                        break;
                    }
                }
                if (target == null) {
                    ctx.status(HttpStatus.NOT_FOUND).json(Map.of("error", "Rule not found"));
                    return;
                }
                Map<String, Object> body = ctx.bodyAsClass(Map.class);
                if (body.containsKey("pathPrefix")) target.setPathPrefix((String) body.get("pathPrefix"));
                if (body.containsKey("targetPool")) target.setTargetPool((String) body.get("targetPool"));
                if (body.containsKey("priority")) target.setPriority(((Number) body.get("priority")).intValue());
                if (body.containsKey("enabled")) target.setEnabled((Boolean) body.get("enabled"));

                proxyServer.updateRules(rules);

                try (Connection conn = db.getConnection();
                     PreparedStatement ps = conn.prepareStatement("UPDATE rules SET path_prefix = ?, target_pool = ?, priority = ?, enabled = ? WHERE id = ?")) {
                    ps.setString(1, target.getPathPrefix());
                    ps.setString(2, target.getTargetPool());
                    ps.setInt(3, target.getPriority());
                    ps.setInt(4, target.isEnabled() ? 1 : 0);
                    ps.setString(5, id);
                    ps.executeUpdate();
                }

                ctx.json(target);
            });

            app.delete("/rules/{id}", ctx -> {
                String id = ctx.pathParam("id");
                proxyConfig.removeRule(id);
                proxyServer.updateRules(proxyConfig.getRoutingRules());

                try (Connection conn = db.getConnection();
                     PreparedStatement ps = conn.prepareStatement("DELETE FROM rules WHERE id = ?")) {
                    ps.setString(1, id);
                    ps.executeUpdate();
                }
                ctx.json(Map.of("message", "Rule deleted"));
            });

            app.put("/rules/reorder", ctx -> {
                List<Map<String, Object>> reordered = ctx.bodyAsClass(List.class);
                List<RoutingRule> currentRules = proxyConfig.getRoutingRules();
                for (int i = 0; i < reordered.size(); i++) {
                    String ruleId = (String) reordered.get(i).get("id");
                    int newPriority = i + 1;
                    for (RoutingRule r : currentRules) {
                        if (r.getId().equals(ruleId)) {
                            r.setPriority(newPriority);
                            break;
                        }
                    }
                }
                proxyServer.updateRules(currentRules);

                try (Connection conn = db.getConnection();
                     PreparedStatement ps = conn.prepareStatement("UPDATE rules SET priority = ? WHERE id = ?")) {
                    for (RoutingRule r : currentRules) {
                        ps.setInt(1, r.getPriority());
                        ps.setString(2, r.getId());
                        ps.addBatch();
                    }
                    ps.executeBatch();
                }

                ctx.json(proxyConfig.getRoutingRules());
            });

            // --- Settings Routes ---
            app.get("/settings", ctx -> {
                Map<String, Object> map = new HashMap<>();
                map.put("rateLimitRps", proxyConfig.getRateLimitRps());
                map.put("healthCheckIntervalSec", proxyConfig.getHealthCheckIntervalSec());
                map.put("threadPoolSize", proxyConfig.getThreadPoolSize());
                map.put("proxyPort", proxyConfig.getPort());
                ctx.json(map);
            });

            app.put("/settings", ctx -> {
                Map<String, Object> body = ctx.bodyAsClass(Map.class);
                if (body.containsKey("rateLimitRps")) {
                    int newRps = ((Number) body.get("rateLimitRps")).intValue();
                    proxyServer.updateRateLimit(newRps);
                    db.setSetting("rateLimitRps", String.valueOf(newRps));
                }
                if (body.containsKey("healthCheckIntervalSec")) {
                    int sec = ((Number) body.get("healthCheckIntervalSec")).intValue();
                    proxyServer.updateHealthCheckInterval(sec);
                    db.setSetting("healthCheckIntervalSec", String.valueOf(sec));
                }
                if (body.containsKey("threadPoolSize")) {
                    int poolSize = ((Number) body.get("threadPoolSize")).intValue();
                    proxyConfig.setThreadPoolSize(poolSize);
                    db.setSetting("threadPoolSize", String.valueOf(poolSize));
                }
                ctx.json(Map.of("message", "Settings updated and hot-reloaded successfully"));
            });

            // --- Metrics & Connections Routes ---
            app.get("/metrics/summary", ctx -> {
                ctx.json(metricsManager.getSummary(proxyConfig.getBackends()));
            });

            app.get("/metrics/timeseries", ctx -> {
                ctx.json(metricsManager.getTimeSeries());
            });

            app.get("/connections", ctx -> {
                // List of recent/active connection events
                List<ProxyEvent> events = eventBus.getRecentEvents();
                List<ProxyEvent> filtered = events.stream()
                        .filter(e -> e.getType() == dev.relay.core.model.ProxyEventType.REQUEST_METRIC || e.getType() == dev.relay.core.model.ProxyEventType.CONNECTION_OPENED)
                        .sorted(Comparator.comparingLong(ProxyEvent::getTimestamp).reversed())
                        .limit(50)
                        .collect(Collectors.toList());
                ctx.json(filtered);
            });

            app.get("/logs", ctx -> {
                String search = ctx.queryParam("search");
                String type = ctx.queryParam("type");
                String backend = ctx.queryParam("backend");
                String limitParam = ctx.queryParam("limit");
                int limit = Math.min(200, Integer.parseInt(limitParam != null ? limitParam : "50"));
                String offsetParam = ctx.queryParam("offset");
                int offset = Math.max(0, Integer.parseInt(offsetParam != null ? offsetParam : "0"));

                StringBuilder sql = new StringBuilder("SELECT * FROM logs WHERE 1=1 ");
                List<Object> params = new ArrayList<>();

                if (type != null && !type.isBlank()) {
                    sql.append("AND type = ? ");
                    params.add(type);
                }
                if (backend != null && !backend.isBlank()) {
                    sql.append("AND (backend_name LIKE ? OR backend_port = ?) ");
                    params.add("%" + backend + "%");
                    try {
                        params.add(Integer.parseInt(backend));
                    } catch (NumberFormatException e) {
                        params.add(-1);
                    }
                }
                if (search != null && !search.isBlank()) {
                    sql.append("AND (details LIKE ? OR path LIKE ? OR client_ip LIKE ?) ");
                    params.add("%" + search + "%");
                    params.add("%" + search + "%");
                    params.add("%" + search + "%");
                }
                sql.append("ORDER BY timestamp DESC LIMIT ? OFFSET ?");
                params.add(limit);
                params.add(offset);

                List<Map<String, Object>> logs = new ArrayList<>();
                try (Connection conn = db.getConnection();
                     PreparedStatement ps = conn.prepareStatement(sql.toString())) {
                    for (int i = 0; i < params.size(); i++) {
                        ps.setObject(i + 1, params.get(i));
                    }
                    ResultSet rs = ps.executeQuery();
                    while (rs.next()) {
                        Map<String, Object> row = new HashMap<>();
                        row.put("id", rs.getString("id"));
                        row.put("timestamp", rs.getLong("timestamp"));
                        row.put("type", rs.getString("type"));
                        row.put("clientIp", rs.getString("client_ip"));
                        row.put("method", rs.getString("method"));
                        row.put("path", rs.getString("path"));
                        row.put("pool", rs.getString("pool"));
                        row.put("backendName", rs.getString("backend_name"));
                        row.put("backendPort", rs.getInt("backend_port"));
                        row.put("statusCode", rs.getInt("status_code"));
                        row.put("latencyMs", rs.getInt("latency_ms"));
                        row.put("bytesIn", rs.getInt("bytes_in"));
                        row.put("bytesOut", rs.getInt("bytes_out"));
                        row.put("details", rs.getString("details"));
                        logs.add(row);
                    }
                }
                ctx.json(logs);
            });

            // --- Traffic Generation Routes ---
            app.post("/traffic/generate", ctx -> {
                Map<String, Object> body = ctx.bodyAsClass(Map.class);
                int genRps = body.get("requestsPerSecond") != null ? ((Number) body.get("requestsPerSecond")).intValue() : 10;
                int durSec = body.get("durationSec") != null ? ((Number) body.get("durationSec")).intValue() : 15;
                String path = (String) body.getOrDefault("path", "/api/users");

                Map<String, Object> res = trafficGenerator.startGeneration(genRps, durSec, path);
                ctx.json(res);
            });

            app.get("/traffic/status", ctx -> {
                ctx.json(trafficGenerator.getStatus());
            });

            app.post("/traffic/stop", ctx -> {
                trafficGenerator.stop();
                ctx.json(Map.of("message", "Traffic generator stopped"));
            });

            app.start(apiPort);
            log.info("Relay Control Plane API running on http://127.0.0.1:{}", apiPort);

        } catch (Exception e) {
            log.error("Fatal startup error: {}", e.getMessage(), e);
            System.exit(1);
        }
    }

    private static void setAuthCookie(Context ctx, String token) {
        Cookie cookie = new Cookie("relay_token", token);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(24 * 3600);
        cookie.setSameSite(io.javalin.http.SameSite.LAX);
        ctx.cookie(cookie);
    }

    private static AuthService.User authenticate(Context ctx, AuthService authService) {
        String token = ctx.cookie("relay_token");
        if (token == null) {
            String authHeader = ctx.header("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            }
        }
        if (token == null) return null;

        DecodedJWT jwt = JwtUtil.verifyToken(token);
        if (jwt == null) return null;

        String userId = jwt.getSubject();
        return authService.getUserById(userId);
    }
}
