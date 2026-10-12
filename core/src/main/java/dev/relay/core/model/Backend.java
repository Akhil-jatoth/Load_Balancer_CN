package dev.relay.core.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

public class Backend {
    private String id;
    private String name;
    private String host;
    private int port;
    private String pool; // e.g. "api", "static", "default"
    private int weight = 1;
    private volatile boolean enabled = true;
    private volatile BackendStatus status = BackendStatus.UP;
    private volatile long lastCheckTimestamp = 0;
    private volatile long lastResponseTimeMs = 0;
    private volatile int consecutiveFailures = 0;
    private volatile int consecutiveSuccesses = 0;

    @JsonIgnore
    private final AtomicInteger activeConnections = new AtomicInteger(0);

    private final AtomicLong totalRequests = new AtomicLong(0);
    private final AtomicLong totalBytesIn = new AtomicLong(0);
    private final AtomicLong totalBytesOut = new AtomicLong(0);

    public Backend() {}

    public Backend(String id, String name, String host, int port, String pool) {
        this.id = id;
        this.name = name;
        this.host = host;
        this.port = port;
        this.pool = pool;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getHost() {
        return host;
    }

    public void setHost(String host) {
        this.host = host;
    }

    public int getPort() {
        return port;
    }

    public void setPort(int port) {
        this.port = port;
    }

    public String getPool() {
        return pool;
    }

    public void setPool(String pool) {
        this.pool = pool;
    }

    public int getWeight() {
        return weight;
    }

    public void setWeight(int weight) {
        this.weight = weight;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public BackendStatus getStatus() {
        return status;
    }

    public void setStatus(BackendStatus status) {
        this.status = status;
    }

    public boolean isHealthy() {
        return enabled && status == BackendStatus.UP;
    }

    public long getLastCheckTimestamp() {
        return lastCheckTimestamp;
    }

    public void setLastCheckTimestamp(long lastCheckTimestamp) {
        this.lastCheckTimestamp = lastCheckTimestamp;
    }

    public long getLastResponseTimeMs() {
        return lastResponseTimeMs;
    }

    public void setLastResponseTimeMs(long lastResponseTimeMs) {
        this.lastResponseTimeMs = lastResponseTimeMs;
    }

    public int getConsecutiveFailures() {
        return consecutiveFailures;
    }

    public void setConsecutiveFailures(int consecutiveFailures) {
        this.consecutiveFailures = consecutiveFailures;
    }

    public int getConsecutiveSuccesses() {
        return consecutiveSuccesses;
    }

    public void setConsecutiveSuccesses(int consecutiveSuccesses) {
        this.consecutiveSuccesses = consecutiveSuccesses;
    }

    public int getActiveConnections() {
        return activeConnections.get();
    }

    public int incrementActiveConnections() {
        return activeConnections.incrementAndGet();
    }

    public int decrementActiveConnections() {
        return activeConnections.decrementAndGet();
    }

    public long getTotalRequests() {
        return totalRequests.get();
    }

    public void incrementRequests() {
        totalRequests.incrementAndGet();
    }

    public long getTotalBytesIn() {
        return totalBytesIn.get();
    }

    public void addBytesIn(long bytes) {
        totalBytesIn.addAndGet(bytes);
    }

    public long getTotalBytesOut() {
        return totalBytesOut.get();
    }

    public void addBytesOut(long bytes) {
        totalBytesOut.addAndGet(bytes);
    }

    @Override
    public String toString() {
        return "Backend{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", address='" + host + ":" + port + '\'' +
                ", pool='" + pool + '\'' +
                ", status=" + status +
                ", active=" + activeConnections.get() +
                '}';
    }
}
