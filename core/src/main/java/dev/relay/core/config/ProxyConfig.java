package dev.relay.core.config;

import dev.relay.core.model.Backend;
import dev.relay.core.model.RoutingRule;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public class ProxyConfig {
    private int port = 8080;
    private int rateLimitRps = 20;
    private int healthCheckIntervalSec = 3;
    private int threadPoolSize = 200;

    private final CopyOnWriteArrayList<Backend> backends = new CopyOnWriteArrayList<>();
    private final CopyOnWriteArrayList<RoutingRule> routingRules = new CopyOnWriteArrayList<>();

    public ProxyConfig() {
        // Defaults
    }

    public static ProxyConfig createDefault() {
        ProxyConfig config = new ProxyConfig();

        // 4 Demo Backends
        config.addBackend(new Backend("b1", "api-service-1", "127.0.0.1", 9001, "api"));
        config.addBackend(new Backend("b2", "api-service-2", "127.0.0.1", 9002, "api"));
        config.addBackend(new Backend("b3", "static-service-1", "127.0.0.1", 9003, "static"));
        config.addBackend(new Backend("b4", "static-service-2", "127.0.0.1", 9004, "static"));

        // Default Rules: /api -> api pool, /static -> static pool
        config.addRule(new RoutingRule("r1", "/api", "api", 1));
        config.addRule(new RoutingRule("r2", "/static", "static", 2));

        return config;
    }

    public int getPort() {
        return port;
    }

    public void setPort(int port) {
        this.port = port;
    }

    public int getRateLimitRps() {
        return rateLimitRps;
    }

    public void setRateLimitRps(int rateLimitRps) {
        this.rateLimitRps = rateLimitRps;
    }

    public int getHealthCheckIntervalSec() {
        return healthCheckIntervalSec;
    }

    public void setHealthCheckIntervalSec(int healthCheckIntervalSec) {
        this.healthCheckIntervalSec = healthCheckIntervalSec;
    }

    public int getThreadPoolSize() {
        return threadPoolSize;
    }

    public void setThreadPoolSize(int threadPoolSize) {
        this.threadPoolSize = threadPoolSize;
    }

    public List<Backend> getBackends() {
        return new ArrayList<>(backends);
    }

    public void addBackend(Backend backend) {
        backends.add(backend);
    }

    public void setBackends(List<Backend> newBackends) {
        backends.clear();
        if (newBackends != null) {
            backends.addAll(newBackends);
        }
    }

    public Backend findBackendById(String id) {
        if (id == null) return null;
        for (Backend b : backends) {
            if (id.equals(b.getId())) return b;
        }
        return null;
    }

    public boolean removeBackend(String id) {
        return backends.removeIf(b -> id.equals(b.getId()));
    }

    public List<RoutingRule> getRoutingRules() {
        return new ArrayList<>(routingRules);
    }

    public void addRule(RoutingRule rule) {
        routingRules.add(rule);
    }

    public void setRoutingRules(List<RoutingRule> rules) {
        routingRules.clear();
        if (rules != null) {
            routingRules.addAll(rules);
        }
    }

    public boolean removeRule(String id) {
        return routingRules.removeIf(r -> id.equals(r.getId()));
    }
}
