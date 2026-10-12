package dev.relay.demobackends;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public class DemoServer {
    private static final Logger log = LoggerFactory.getLogger(DemoServer.class);

    private final String id;
    private final String name;
    private final int port;
    private final String pool;
    private HttpServer server;
    private final AtomicBoolean running = new AtomicBoolean(false);

    public DemoServer(String id, String name, int port, String pool) {
        this.id = id;
        this.name = name;
        this.port = port;
        this.pool = pool;
    }

    public synchronized void start() throws IOException {
        if (running.get()) return;

        server = HttpServer.create(new InetSocketAddress(port), 0);
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor() != null ?
                Executors.newCachedThreadPool() : Executors.newCachedThreadPool());

        server.createContext("/health", new HealthHandler());
        server.createContext("/api", new ApiHandler());
        server.createContext("/static", new StaticHandler());
        server.createContext("/", new DefaultHandler());

        server.start();
        running.set(true);
        log.info("Started Demo Server '{}' ({}) on port {}", name, id, port);
    }

    public synchronized void stop() {
        if (!running.get()) return;
        running.set(false);
        if (server != null) {
            server.stop(0); // immediate stop to simulate failure
            server = null;
        }
        log.info("Stopped Demo Server '{}' ({}) on port {}", name, id, port);
    }

    public boolean isRunning() {
        return running.get();
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public int getPort() {
        return port;
    }

    public String getPool() {
        return pool;
    }

    private class HealthHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String json = String.format(
                    "{\"status\":\"UP\",\"backendId\":\"%s\",\"backendName\":\"%s\",\"port\":%d,\"pool\":\"%s\",\"timestamp\":%d}\n",
                    id, name, port, pool, System.currentTimeMillis()
            );
            sendResponse(exchange, 200, "application/json", json);
        }
    }

    private class ApiHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String path = exchange.getRequestURI().getPath();
            String method = exchange.getRequestMethod();
            String json = String.format(
                    "{\"message\":\"Processed by API Backend %s\",\"backendId\":\"%s\",\"backendName\":\"%s\",\"port\":%d,\"pool\":\"%s\",\"method\":\"%s\",\"path\":\"%s\",\"timestamp\":%d}\n",
                    name, id, name, port, pool, method, path, System.currentTimeMillis()
            );
            sendResponse(exchange, 200, "application/json", json);
        }
    }

    private class StaticHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String path = exchange.getRequestURI().getPath();
            String html = String.format(
                    "<!DOCTYPE html><html><head><title>%s</title></head><body><h1>Static Content Served by %s</h1><p>Backend Port: %d</p><p>Pool: %s</p><p>Path: %s</p></body></html>",
                    name, name, port, pool, path
            );
            sendResponse(exchange, 200, "text/html", html);
        }
    }

    private class DefaultHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String path = exchange.getRequestURI().getPath();
            String json = String.format(
                    "{\"service\":\"Relay Demo Backend\",\"backendId\":\"%s\",\"backendName\":\"%s\",\"port\":%d,\"pool\":\"%s\",\"path\":\"%s\",\"timestamp\":%d}\n",
                    id, name, port, pool, path, System.currentTimeMillis()
            );
            sendResponse(exchange, 200, "application/json", json);
        }
    }

    private void sendResponse(HttpExchange exchange, int statusCode, String contentType, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", contentType);
        exchange.getResponseHeaders().set("X-Backend-Server", name);
        exchange.getResponseHeaders().set("X-Backend-Port", String.valueOf(port));
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
            os.flush();
        }
    }
}
