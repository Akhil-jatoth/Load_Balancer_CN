package dev.relay.api.metrics;

import dev.relay.core.event.EventBus;
import dev.relay.core.model.Backend;
import dev.relay.core.model.ProxyEvent;
import dev.relay.core.model.ProxyEventType;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

public class MetricsManager {
    public static class MetricPoint {
        public long timestamp;
        public int requests;
        public double avgLatencyMs;
        public int errors;
        public int blocked;

        public MetricPoint(long timestamp, int requests, double avgLatencyMs, int errors, int blocked) {
            this.timestamp = timestamp;
            this.requests = requests;
            this.avgLatencyMs = avgLatencyMs;
            this.errors = errors;
            this.blocked = blocked;
        }
    }

    private final EventBus eventBus;
    private final AtomicInteger currentSecondRequests = new AtomicInteger(0);
    private final AtomicLong currentSecondLatencySum = new AtomicLong(0);
    private final AtomicInteger currentSecondErrors = new AtomicInteger(0);
    private final AtomicInteger currentSecondBlocked = new AtomicInteger(0);

    private final AtomicLong totalRequests = new AtomicLong(0);
    private final AtomicLong totalBlocked = new AtomicLong(0);
    private final AtomicLong totalErrors = new AtomicLong(0);
    private final AtomicLong totalLatencySum = new AtomicLong(0);

    private final ConcurrentLinkedDeque<MetricPoint> timeSeries = new ConcurrentLinkedDeque<>();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "Relay-Metrics-Aggregator");
        t.setDaemon(true);
        return t;
    });

    public MetricsManager(EventBus eventBus) {
        this.eventBus = eventBus;
        this.eventBus.addListener(this::recordEvent);

        // Pre-fill last 30 data points with calm baseline
        long now = System.currentTimeMillis();
        for (int i = 29; i >= 0; i--) {
            timeSeries.add(new MetricPoint(now - (i * 1000L), 0, 0, 0, 0));
        }

        // Ticker runs every 1 second
        scheduler.scheduleAtFixedRate(this::tick, 1, 1, TimeUnit.SECONDS);
    }

    private void recordEvent(ProxyEvent event) {
        if (event == null) return;

        if (event.getType() == ProxyEventType.RATE_LIMIT_BLOCKED) {
            currentSecondBlocked.incrementAndGet();
            totalBlocked.incrementAndGet();
        } else if (event.getType() == ProxyEventType.REQUEST_METRIC) {
            currentSecondRequests.incrementAndGet();
            totalRequests.incrementAndGet();
            currentSecondLatencySum.addAndGet(event.getLatencyMs());
            totalLatencySum.addAndGet(event.getLatencyMs());
            if (event.getStatusCode() >= 400) {
                currentSecondErrors.incrementAndGet();
                totalErrors.incrementAndGet();
            }
        }
    }

    private void tick() {
        int reqs = currentSecondRequests.getAndSet(0);
        long latencySum = currentSecondLatencySum.getAndSet(0);
        int errors = currentSecondErrors.getAndSet(0);
        int blocked = currentSecondBlocked.getAndSet(0);

        double avgLatency = reqs > 0 ? (double) latencySum / reqs : 0.0;
        timeSeries.addLast(new MetricPoint(System.currentTimeMillis(), reqs, Math.round(avgLatency * 10.0) / 10.0, errors, blocked));

        // Keep maximum 120 seconds of data points
        while (timeSeries.size() > 120) {
            timeSeries.pollFirst();
        }
    }

    public List<MetricPoint> getTimeSeries() {
        return new ArrayList<>(timeSeries);
    }

    public Map<String, Object> getSummary(List<Backend> backends) {
        int healthyCount = 0;
        int totalBackends = backends != null ? backends.size() : 0;
        int activeConnections = 0;
        long bytesIn = 0;
        long bytesOut = 0;

        if (backends != null) {
            for (Backend b : backends) {
                if (b.isHealthy()) {
                    healthyCount++;
                }
                activeConnections += b.getActiveConnections();
                bytesIn += b.getTotalBytesIn();
                bytesOut += b.getTotalBytesOut();
            }
        }

        MetricPoint lastPoint = timeSeries.peekLast();
        int rps = lastPoint != null ? lastPoint.requests : 0;
        double currentLatency = lastPoint != null ? lastPoint.avgLatencyMs : 0.0;

        long reqTotal = totalRequests.get();
        double overallAvgLatency = reqTotal > 0 ? (double) totalLatencySum.get() / reqTotal : 0.0;

        Map<String, Object> summary = new HashMap<>();
        summary.put("activeConnections", activeConnections);
        summary.put("requestsPerSecond", rps);
        summary.put("avgLatencyMs", Math.round(currentLatency * 10.0) / 10.0);
        summary.put("overallAvgLatencyMs", Math.round(overallAvgLatency * 10.0) / 10.0);
        summary.put("healthyBackends", healthyCount);
        summary.put("totalBackends", totalBackends);
        summary.put("blockedRequests", totalBlocked.get());
        summary.put("totalRequests", reqTotal);
        summary.put("totalErrors", totalErrors.get());
        summary.put("totalBytesIn", bytesIn);
        summary.put("totalBytesOut", bytesOut);
        summary.put("timestamp", System.currentTimeMillis());

        return summary;
    }
}
