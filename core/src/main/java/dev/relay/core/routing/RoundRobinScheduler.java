package dev.relay.core.routing;

import dev.relay.core.model.Backend;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

public class RoundRobinScheduler {
    private final ConcurrentHashMap<String, AtomicInteger> poolCounters = new ConcurrentHashMap<>();

    public Backend selectBackend(String pool, List<Backend> allBackends) {
        if (allBackends == null || allBackends.isEmpty()) {
            return null;
        }

        String targetPool = (pool == null || pool.isBlank()) ? "default" : pool.trim().toLowerCase();

        // Filter backends for target pool that are UP and enabled
        List<Backend> healthyPoolBackends = allBackends.stream()
                .filter(b -> b.getPool() != null && b.getPool().equalsIgnoreCase(targetPool))
                .filter(Backend::isHealthy)
                .collect(Collectors.toList());

        // Fallback to default pool if target pool has no healthy backends
        if (healthyPoolBackends.isEmpty() && !targetPool.equals("default")) {
            healthyPoolBackends = allBackends.stream()
                    .filter(b -> b.getPool() != null && b.getPool().equalsIgnoreCase("default"))
                    .filter(Backend::isHealthy)
                    .collect(Collectors.toList());
        }

        // Final fallback: any healthy backend
        if (healthyPoolBackends.isEmpty()) {
            healthyPoolBackends = allBackends.stream()
                    .filter(Backend::isHealthy)
                    .collect(Collectors.toList());
        }

        if (healthyPoolBackends.isEmpty()) {
            return null; // All backends are DOWN or disabled
        }

        AtomicInteger counter = poolCounters.computeIfAbsent(targetPool, k -> new AtomicInteger(0));
        int count = counter.getAndIncrement();
        // Handle Integer.MIN_VALUE overflow safely
        int index = Math.floorMod(count, healthyPoolBackends.size());
        return healthyPoolBackends.get(index);
    }

    public int getCounter(String pool) {
        AtomicInteger counter = poolCounters.get(pool.toLowerCase());
        return counter != null ? counter.get() : 0;
    }

    public void reset() {
        poolCounters.clear();
    }
}
