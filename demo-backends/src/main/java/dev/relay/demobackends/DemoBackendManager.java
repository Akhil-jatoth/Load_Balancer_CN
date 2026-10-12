package dev.relay.demobackends;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.Collection;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class DemoBackendManager {
    private static final Logger log = LoggerFactory.getLogger(DemoBackendManager.class);

    private final Map<String, DemoServer> servers = new ConcurrentHashMap<>();

    public DemoBackendManager() {
        register(new DemoServer("b1", "api-service-1", 9001, "api"));
        register(new DemoServer("b2", "api-service-2", 9002, "api"));
        register(new DemoServer("b3", "static-service-1", 9003, "static"));
        register(new DemoServer("b4", "static-service-2", 9004, "static"));
    }

    public void register(DemoServer server) {
        servers.put(server.getId(), server);
    }

    public void startAll() {
        for (DemoServer server : servers.values()) {
            try {
                server.start();
            } catch (IOException e) {
                log.error("Failed to start server {}: {}", server.getName(), e.getMessage());
            }
        }
    }

    public void stopAll() {
        for (DemoServer server : servers.values()) {
            server.stop();
        }
    }

    public boolean startBackend(String id) {
        DemoServer s = servers.get(id);
        if (s != null) {
            try {
                s.start();
                return true;
            } catch (IOException e) {
                log.error("Failed to start server {}: {}", s.getName(), e.getMessage());
                return false;
            }
        }
        return false;
    }

    public boolean stopBackend(String id) {
        DemoServer s = servers.get(id);
        if (s != null) {
            s.stop();
            return true;
        }
        return false;
    }

    public boolean isRunning(String id) {
        DemoServer s = servers.get(id);
        return s != null && s.isRunning();
    }

    public DemoServer getServer(String id) {
        return servers.get(id);
    }

    public Collection<DemoServer> getAllServers() {
        return servers.values();
    }
}
