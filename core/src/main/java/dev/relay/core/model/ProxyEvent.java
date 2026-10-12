package dev.relay.core.model;

import java.util.UUID;

public class ProxyEvent {
    private String id;
    private long timestamp;
    private ProxyEventType type;
    private String clientIp;
    private String method;
    private String path;
    private String pool;
    private String backendId;
    private String backendName;
    private int backendPort;
    private long latencyMs;
    private long bytesIn;
    private long bytesOut;
    private int statusCode;
    private String details;

    public ProxyEvent() {
        this.id = UUID.randomUUID().toString();
        this.timestamp = System.currentTimeMillis();
    }

    public ProxyEvent(ProxyEventType type, String clientIp, String details) {
        this();
        this.type = type;
        this.clientIp = clientIp;
        this.details = details;
    }

    public static ProxyEvent connectionOpened(String clientIp, String details) {
        return new ProxyEvent(ProxyEventType.CONNECTION_OPENED, clientIp, details);
    }

    public static ProxyEvent connectionClosed(String clientIp, String backendId, long bytesIn, long bytesOut, long latencyMs) {
        ProxyEvent e = new ProxyEvent(ProxyEventType.CONNECTION_CLOSED, clientIp, null);
        e.setBackendId(backendId);
        e.setBytesIn(bytesIn);
        e.setBytesOut(bytesOut);
        e.setLatencyMs(latencyMs);
        return e;
    }

    public static ProxyEvent routeDecision(String clientIp, String method, String path, String pool, String backendId, String backendName, int backendPort) {
        ProxyEvent e = new ProxyEvent(ProxyEventType.ROUTE_DECISION, clientIp, "Routed " + path + " -> pool:" + pool + " -> " + backendName);
        e.setMethod(method);
        e.setPath(path);
        e.setPool(pool);
        e.setBackendId(backendId);
        e.setBackendName(backendName);
        e.setBackendPort(backendPort);
        return e;
    }

    public static ProxyEvent backendStateChange(String backendId, String backendName, int port, BackendStatus oldStatus, BackendStatus newStatus, String reason) {
        ProxyEvent e = new ProxyEvent(ProxyEventType.BACKEND_STATE_CHANGE, "127.0.0.1", "Backend " + backendName + ":" + port + " transitioned " + oldStatus + " -> " + newStatus + " (" + reason + ")");
        e.setBackendId(backendId);
        e.setBackendName(backendName);
        e.setBackendPort(port);
        return e;
    }

    public static ProxyEvent rateLimitBlocked(String clientIp, String path, int currentRate, int limit) {
        ProxyEvent e = new ProxyEvent(ProxyEventType.RATE_LIMIT_BLOCKED, clientIp, "Blocked " + clientIp + " - rate " + currentRate + "/" + limit + " req/s exceeded");
        e.setPath(path);
        e.setStatusCode(429);
        return e;
    }

    public static ProxyEvent requestMetric(String clientIp, String method, String path, String pool, String backendId, String backendName, int backendPort, int statusCode, long latencyMs, long bytesIn, long bytesOut) {
        ProxyEvent e = new ProxyEvent(ProxyEventType.REQUEST_METRIC, clientIp, method + " " + path + " -> " + statusCode + " (" + latencyMs + "ms)");
        e.setMethod(method);
        e.setPath(path);
        e.setPool(pool);
        e.setBackendId(backendId);
        e.setBackendName(backendName);
        e.setBackendPort(backendPort);
        e.setStatusCode(statusCode);
        e.setLatencyMs(latencyMs);
        e.setBytesIn(bytesIn);
        e.setBytesOut(bytesOut);
        return e;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

    public ProxyEventType getType() {
        return type;
    }

    public void setType(ProxyEventType type) {
        this.type = type;
    }

    public String getClientIp() {
        return clientIp;
    }

    public void setClientIp(String clientIp) {
        this.clientIp = clientIp;
    }

    public String getMethod() {
        return method;
    }

    public void setMethod(String method) {
        this.method = method;
    }

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public String getPool() {
        return pool;
    }

    public void setPool(String pool) {
        this.pool = pool;
    }

    public String getBackendId() {
        return backendId;
    }

    public void setBackendId(String backendId) {
        this.backendId = backendId;
    }

    public String getBackendName() {
        return backendName;
    }

    public void setBackendName(String backendName) {
        this.backendName = backendName;
    }

    public int getBackendPort() {
        return backendPort;
    }

    public void setBackendPort(int backendPort) {
        this.backendPort = backendPort;
    }

    public long getLatencyMs() {
        return latencyMs;
    }

    public void setLatencyMs(long latencyMs) {
        this.latencyMs = latencyMs;
    }

    public long getBytesIn() {
        return bytesIn;
    }

    public void setBytesIn(long bytesIn) {
        this.bytesIn = bytesIn;
    }

    public long getBytesOut() {
        return bytesOut;
    }

    public void setBytesOut(long bytesOut) {
        this.bytesOut = bytesOut;
    }

    public int getStatusCode() {
        return statusCode;
    }

    public void setStatusCode(int statusCode) {
        this.statusCode = statusCode;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }
}
