package dev.relay.api.traffic;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

public class TrafficGenerator {
    private static final Logger log = LoggerFactory.getLogger(TrafficGenerator.class);

    private final String targetBaseUrl;
    private final HttpClient client;
    private final ExecutorService executor = Executors.newCachedThreadPool();

    private final AtomicBoolean active = new AtomicBoolean(false);
    private final AtomicLong totalSent = new AtomicLong(0);
    private final AtomicLong totalSuccess = new AtomicLong(0);
    private final AtomicLong totalErrors = new AtomicLong(0);
    private volatile int currentTargetRps = 0;
    private volatile long runStartTime = 0;
    private volatile long runDurationMs = 0;

    public TrafficGenerator(String targetBaseUrl) {
        this.targetBaseUrl = targetBaseUrl;
        this.client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(2000))
                .build();
    }

    public synchronized Map<String, Object> startGeneration(int rps, int durationSec, String path) {
        if (active.get()) {
            return getStatus();
        }

        final int targetRps = Math.max(1, Math.min(200, rps));
        final int durationSeconds = Math.max(1, Math.min(300, durationSec));
        final String requestPath = (path == null || path.isBlank()) ? "/api/users" : (path.startsWith("/") ? path : "/" + path);

        active.set(true);
        totalSent.set(0);
        totalSuccess.set(0);
        totalErrors.set(0);
        currentTargetRps = targetRps;
        runStartTime = System.currentTimeMillis();
        runDurationMs = durationSeconds * 1000L;

        executor.submit(() -> runLoadLoop(targetRps, durationSeconds, requestPath));

        log.info("Started traffic generation: {} req/s for {}s to path '{}'", targetRps, durationSeconds, requestPath);
        return getStatus();
    }

    private void runLoadLoop(int targetRps, int durationSec, String path) {
        long endTime = System.currentTimeMillis() + (durationSec * 1000L);
        long delayBetweenRequestsMs = Math.max(1, 1000L / targetRps);

        while (System.currentTimeMillis() < endTime && active.get()) {
            long tickStart = System.currentTimeMillis();

            // Fire one batch of requests for this tick
            executor.submit(() -> fireRequest(path));

            long elapsed = System.currentTimeMillis() - tickStart;
            long sleepTime = delayBetweenRequestsMs - elapsed;
            if (sleepTime > 0) {
                try {
                    Thread.sleep(sleepTime);
                } catch (InterruptedException e) {
                    break;
                }
            }
        }

        active.set(false);
        log.info("Traffic generation completed. Sent: {}, Success: {}, Errors: {}",
                totalSent.get(), totalSuccess.get(), totalErrors.get());
    }

    private void fireRequest(String path) {
        try {
            totalSent.incrementAndGet();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(targetBaseUrl + path))
                    .timeout(Duration.ofMillis(4000))
                    .header("User-Agent", "Relay-LoadTest/1.0")
                    .GET()
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 400) {
                totalSuccess.incrementAndGet();
            } else {
                totalErrors.incrementAndGet();
            }
        } catch (Exception e) {
            totalErrors.incrementAndGet();
        }
    }

    public synchronized void stop() {
        active.set(false);
    }

    public Map<String, Object> getStatus() {
        Map<String, Object> map = new HashMap<>();
        map.put("active", active.get());
        map.put("targetRps", currentTargetRps);
        map.put("totalSent", totalSent.get());
        map.put("totalSuccess", totalSuccess.get());
        map.put("totalErrors", totalErrors.get());
        map.put("elapsedSec", active.get() ? (System.currentTimeMillis() - runStartTime) / 1000 : 0);
        map.put("remainingSec", active.get() ? Math.max(0, (runDurationMs - (System.currentTimeMillis() - runStartTime)) / 1000) : 0);
        return map;
    }
}
