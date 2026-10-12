package dev.relay.core.health;

import dev.relay.core.event.EventBus;
import dev.relay.core.model.Backend;
import dev.relay.core.model.BackendStatus;
import dev.relay.core.model.ProxyEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class HealthChecker {
    private static final Logger log = LoggerFactory.getLogger(HealthChecker.class);

    private final List<Backend> backends;
    private final EventBus eventBus;
    private final AtomicInteger intervalSeconds;
    private final int connectTimeoutMs = 1000;
    private final int readTimeoutMs = 1000;

    private ScheduledExecutorService scheduler;
    private ScheduledFuture<?> scheduledTask;
    private volatile boolean running = false;

    public HealthChecker(List<Backend> backends, EventBus eventBus) {
        this(backends, eventBus, 3);
    }

    public HealthChecker(List<Backend> backends, EventBus eventBus, int intervalSeconds) {
        this.backends = backends != null ? backends : new CopyOnWriteArrayList<>();
        this.eventBus = eventBus;
        this.intervalSeconds = new AtomicInteger(Math.max(1, intervalSeconds));
    }

    public synchronized void start() {
        if (running) return;
        running = true;
        scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "Relay-HealthChecker-Daemon");
            t.setDaemon(true);
            return t;
        });

        reschedule();
        log.info("HealthChecker started with interval: {}s", intervalSeconds.get());
    }

    public synchronized void stop() {
        if (!running) return;
        running = false;
        if (scheduledTask != null) {
            scheduledTask.cancel(true);
        }
        if (scheduler != null) {
            scheduler.shutdownNow();
        }
        log.info("HealthChecker stopped");
    }

    public synchronized void setIntervalSeconds(int seconds) {
        int sec = Math.max(1, seconds);
        this.intervalSeconds.set(sec);
        if (running) {
            reschedule();
        }
    }

    public int getIntervalSeconds() {
        return intervalSeconds.get();
    }

    private synchronized void reschedule() {
        if (scheduledTask != null) {
            scheduledTask.cancel(false);
        }
        if (scheduler != null && !scheduler.isShutdown()) {
            scheduledTask = scheduler.scheduleWithFixedDelay(
                    this::runCheckRound,
                    1,
                    intervalSeconds.get(),
                    TimeUnit.SECONDS
            );
        }
    }

    public void runCheckRound() {
        for (Backend backend : backends) {
            if (!backend.isEnabled()) {
                continue;
            }
            checkBackend(backend);
        }
    }

    public boolean checkBackend(Backend backend) {
        long startTime = System.currentTimeMillis();
        boolean success = false;
        String failureReason = null;
        int responseCode = 0;

        try (Socket socket = new Socket()) {
            socket.setSoTimeout(readTimeoutMs);
            socket.connect(new InetSocketAddress(backend.getHost(), backend.getPort()), connectTimeoutMs);

            OutputStream out = socket.getOutputStream();
            String request = "GET /health HTTP/1.1\r\n" +
                    "Host: " + backend.getHost() + ":" + backend.getPort() + "\r\n" +
                    "User-Agent: Relay-HealthChecker/1.0\r\n" +
                    "Connection: close\r\n\r\n";
            out.write(request.getBytes(StandardCharsets.US_ASCII));
            out.flush();

            BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.US_ASCII));
            String statusLine = reader.readLine();
            if (statusLine != null && statusLine.startsWith("HTTP/1.")) {
                String[] parts = statusLine.split(" ");
                if (parts.length >= 2) {
                    responseCode = Integer.parseInt(parts[1]);
                    if (responseCode >= 200 && responseCode < 300) {
                        success = true;
                    } else {
                        failureReason = "HTTP " + responseCode;
                    }
                }
            } else {
                failureReason = "Empty or invalid HTTP response";
            }
        } catch (Exception e) {
            failureReason = e.getClass().getSimpleName() + ": " + e.getMessage();
        }

        long latencyMs = System.currentTimeMillis() - startTime;
        backend.setLastCheckTimestamp(System.currentTimeMillis());
        backend.setLastResponseTimeMs(latencyMs);

        BackendStatus oldStatus = backend.getStatus();

        if (success) {
            backend.setConsecutiveFailures(0);
            int successes = backend.getConsecutiveSuccesses() + 1;
            backend.setConsecutiveSuccesses(successes);

            // Flip to UP after 2 consecutive successes
            if (successes >= 2 && oldStatus != BackendStatus.UP) {
                backend.setStatus(BackendStatus.UP);
                if (eventBus != null) {
                    eventBus.publish(ProxyEvent.backendStateChange(
                            backend.getId(),
                            backend.getName(),
                            backend.getPort(),
                            oldStatus,
                            BackendStatus.UP,
                            "Health check recovered (2 consecutive successes, " + latencyMs + "ms)"
                    ));
                }
                log.info("Backend {} ({}:{}) transitioned to UP", backend.getName(), backend.getHost(), backend.getPort());
            }
        } else {
            backend.setConsecutiveSuccesses(0);
            int failures = backend.getConsecutiveFailures() + 1;
            backend.setConsecutiveFailures(failures);

            // Flip to DOWN after 2 consecutive failures
            if (failures >= 2 && oldStatus != BackendStatus.DOWN) {
                backend.setStatus(BackendStatus.DOWN);
                if (eventBus != null) {
                    eventBus.publish(ProxyEvent.backendStateChange(
                            backend.getId(),
                            backend.getName(),
                            backend.getPort(),
                            oldStatus,
                            BackendStatus.DOWN,
                            "Health check failed (2 consecutive failures: " + failureReason + ")"
                    ));
                }
                log.warn("Backend {} ({}:{}) transitioned to DOWN: {}", backend.getName(), backend.getHost(), backend.getPort(), failureReason);
            }
        }

        return success;
    }
}
