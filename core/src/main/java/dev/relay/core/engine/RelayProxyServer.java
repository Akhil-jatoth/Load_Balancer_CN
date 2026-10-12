package dev.relay.core.engine;

import dev.relay.core.config.ProxyConfig;
import dev.relay.core.event.EventBus;
import dev.relay.core.health.HealthChecker;
import dev.relay.core.model.Backend;
import dev.relay.core.model.RoutingRule;
import dev.relay.core.ratelimit.SlidingWindowRateLimiter;
import dev.relay.core.routing.ContentRouter;
import dev.relay.core.routing.RoundRobinScheduler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public class RelayProxyServer {
    private static final Logger log = LoggerFactory.getLogger(RelayProxyServer.class);

    private final ProxyConfig config;
    private final EventBus eventBus;
    private final ContentRouter router;
    private final RoundRobinScheduler scheduler;
    private final SlidingWindowRateLimiter rateLimiter;
    private final HealthChecker healthChecker;

    private ServerSocket serverSocket;
    private ExecutorService workerPool;
    private Thread listenerThread;
    private final AtomicBoolean running = new AtomicBoolean(false);

    public RelayProxyServer(ProxyConfig config, EventBus eventBus) {
        this.config = config != null ? config : ProxyConfig.createDefault();
        this.eventBus = eventBus != null ? eventBus : new EventBus();
        this.router = new ContentRouter(this.config.getRoutingRules());
        this.scheduler = new RoundRobinScheduler();
        this.rateLimiter = new SlidingWindowRateLimiter(this.config.getRateLimitRps());
        this.healthChecker = new HealthChecker(this.config.getBackends(), this.eventBus, this.config.getHealthCheckIntervalSec());
    }

    public synchronized void start() throws IOException {
        if (running.get()) return;

        workerPool = Executors.newCachedThreadPool(r -> {
            Thread t = new Thread(r, "Relay-Worker-" + System.nanoTime());
            t.setDaemon(true);
            return t;
        });

        serverSocket = new ServerSocket(config.getPort());
        running.set(true);

        healthChecker.start();

        listenerThread = new Thread(this::listenLoop, "Relay-Listener-Port-" + config.getPort());
        listenerThread.setDaemon(false);
        listenerThread.start();

        log.info("Relay Proxy Server listening on port {}", config.getPort());
    }

    private void listenLoop() {
        while (running.get()) {
            try {
                Socket clientSocket = serverSocket.accept();
                ConnectionHandler handler = new ConnectionHandler(
                        clientSocket,
                        config,
                        router,
                        scheduler,
                        rateLimiter,
                        eventBus,
                        workerPool
                );
                workerPool.submit(handler);
            } catch (IOException e) {
                if (!running.get()) {
                    break; // Server stopped
                }
                log.warn("Error accepting connection: {}", e.getMessage());
            }
        }
    }

    public synchronized void stop() {
        if (!running.get()) return;
        running.set(false);

        if (healthChecker != null) {
            healthChecker.stop();
        }

        try {
            if (serverSocket != null && !serverSocket.isClosed()) {
                serverSocket.close();
            }
        } catch (IOException e) {
            log.warn("Error closing server socket: {}", e.getMessage());
        }

        if (workerPool != null && !workerPool.isShutdown()) {
            workerPool.shutdown();
        }

        log.info("Relay Proxy Server stopped");
    }

    // --- Hot-Reload API ---

    public void updateRateLimit(int rps) {
        config.setRateLimitRps(rps);
        rateLimiter.setLimit(rps);
        log.info("Hot-reloaded rate limit to {} rps", rps);
    }

    public void updateBackends(List<Backend> backends) {
        config.setBackends(backends);
        log.info("Hot-reloaded backends (count={})", backends.size());
    }

    public void updateRules(List<RoutingRule> rules) {
        config.setRoutingRules(rules);
        router.setRules(rules);
        log.info("Hot-reloaded routing rules (count={})", rules.size());
    }

    public void updateHealthCheckInterval(int intervalSec) {
        config.setHealthCheckIntervalSec(intervalSec);
        healthChecker.setIntervalSeconds(intervalSec);
        log.info("Hot-reloaded health check interval to {}s", intervalSec);
    }

    public boolean isRunning() {
        return running.get();
    }

    public ProxyConfig getConfig() {
        return config;
    }

    public EventBus getEventBus() {
        return eventBus;
    }

    public ContentRouter getRouter() {
        return router;
    }

    public RoundRobinScheduler getScheduler() {
        return scheduler;
    }

    public SlidingWindowRateLimiter getRateLimiter() {
        return rateLimiter;
    }

    public HealthChecker getHealthChecker() {
        return healthChecker;
    }
}
