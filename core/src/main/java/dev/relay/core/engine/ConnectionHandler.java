package dev.relay.core.engine;

import dev.relay.core.config.ProxyConfig;
import dev.relay.core.event.EventBus;
import dev.relay.core.model.Backend;
import dev.relay.core.model.ProxyEvent;
import dev.relay.core.ratelimit.SlidingWindowRateLimiter;
import dev.relay.core.routing.ContentRouter;
import dev.relay.core.routing.RoundRobinScheduler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

public class ConnectionHandler implements Runnable {
    private static final Logger log = LoggerFactory.getLogger(ConnectionHandler.class);

    private final Socket clientSocket;
    private final ProxyConfig config;
    private final ContentRouter router;
    private final RoundRobinScheduler scheduler;
    private final SlidingWindowRateLimiter rateLimiter;
    private final EventBus eventBus;
    private final ExecutorService executor;

    public ConnectionHandler(
            Socket clientSocket,
            ProxyConfig config,
            ContentRouter router,
            RoundRobinScheduler scheduler,
            SlidingWindowRateLimiter rateLimiter,
            EventBus eventBus,
            ExecutorService executor) {
        this.clientSocket = clientSocket;
        this.config = config;
        this.router = router;
        this.scheduler = scheduler;
        this.rateLimiter = rateLimiter;
        this.eventBus = eventBus;
        this.executor = executor;
    }

    @Override
    public void run() {
        long startTime = System.currentTimeMillis();
        String clientIp = "127.0.0.1";
        if (clientSocket.getRemoteSocketAddress() instanceof InetSocketAddress addr) {
            clientIp = addr.getAddress().getHostAddress();
        }

        Socket backendSocket = null;
        Backend backend = null;
        String method = "GET";
        String path = "/";
        String pool = "default";
        int statusCode = 200;
        AtomicLong bytesInCounter = new AtomicLong(0);
        AtomicLong bytesOutCounter = new AtomicLong(0);

        try {
            clientSocket.setSoTimeout(10000); // 10s socket timeout for initial read

            // 1. Rate-Limit Check
            int currentRate = rateLimiter.getCurrentRate(clientIp);
            if (!rateLimiter.tryAcquire(clientIp)) {
                if (eventBus != null) {
                    eventBus.publish(ProxyEvent.rateLimitBlocked(clientIp, path, currentRate + 1, rateLimiter.getLimit()));
                }
                sendHttpResponse(clientSocket, 429, "Too Many Requests", "HTTP 429: Rate limit of " + rateLimiter.getLimit() + " req/s exceeded for " + clientIp + ".\r\n");
                return;
            }

            // 2. Parse HTTP Request Line & Headers
            InputStream clientIn = clientSocket.getInputStream();
            ByteArrayOutputStream rawBuffer = new ByteArrayOutputStream();
            byte[] buf = new byte[1024];
            int read;
            int headerEnd = -1;

            while ((read = clientIn.read(buf)) != -1) {
                rawBuffer.write(buf, 0, read);
                bytesInCounter.addAndGet(read);

                byte[] currentBytes = rawBuffer.toByteArray();
                headerEnd = findHeaderEnd(currentBytes);
                if (headerEnd != -1) {
                    break;
                }
            }

            if (rawBuffer.size() == 0 || headerEnd == -1) {
                return; // Client closed without complete headers
            }

            byte[] allBytes = rawBuffer.toByteArray();
            String headerText = new String(allBytes, 0, headerEnd, StandardCharsets.ISO_8859_1);
            String[] headerLines = headerText.split("\r\n");
            String firstLine = headerLines.length > 0 ? headerLines[0] : "";
            String[] parts = firstLine.split(" ");
            if (parts.length >= 2) {
                method = parts[0];
                path = parts[1];
            }

            int contentLength = 0;
            for (String line : headerLines) {
                if (line.toLowerCase().startsWith("content-length:")) {
                    try {
                        contentLength = Integer.parseInt(line.substring(15).trim());
                    } catch (NumberFormatException ignored) {}
                }
            }

            // 3. Content-Based Routing
            pool = router.route(path);

            // 4. Round-Robin Backend Selection
            backend = scheduler.selectBackend(pool, config.getBackends());
            if (backend == null) {
                statusCode = 503;
                sendHttpResponse(clientSocket, 503, "Service Unavailable", "HTTP 503: No healthy backend available in pool: " + pool + "\r\n");
                if (eventBus != null) {
                    eventBus.publish(ProxyEvent.requestMetric(clientIp, method, path, pool, null, "none", 0, 503, System.currentTimeMillis() - startTime, bytesInCounter.get(), 0));
                }
                return;
            }

            // Emit Route Decision & Connection Opened
            if (eventBus != null) {
                eventBus.publish(ProxyEvent.routeDecision(clientIp, method, path, pool, backend.getId(), backend.getName(), backend.getPort()));
                eventBus.publish(ProxyEvent.connectionOpened(clientIp, method + " " + path + " -> " + backend.getName() + ":" + backend.getPort()));
            }

            // 5. Connect to Backend Socket
            backend.incrementActiveConnections();
            backend.incrementRequests();

            backendSocket = new Socket();
            backendSocket.setSoTimeout(30000);
            backendSocket.connect(new InetSocketAddress(backend.getHost(), backend.getPort()), 3000);

            OutputStream backendOut = backendSocket.getOutputStream();

            // Transform headers to ensure Connection: close
            String modifiedHeaders = headerText;
            if (modifiedHeaders.toLowerCase().contains("connection:")) {
                modifiedHeaders = modifiedHeaders.replaceAll("(?i)Connection:\\s*[^\\r\\n]+", "Connection: close");
            } else {
                modifiedHeaders = modifiedHeaders + "\r\nConnection: close";
            }
            modifiedHeaders += "\r\n\r\n";

            backendOut.write(modifiedHeaders.getBytes(StandardCharsets.ISO_8859_1));

            // Forward any request body bytes already read in the buffer
            int bodyAlreadyRead = allBytes.length - headerEnd;
            if (bodyAlreadyRead > 0) {
                backendOut.write(allBytes, headerEnd, bodyAlreadyRead);
            }
            backendOut.flush();

            int remainingBodyToRead = Math.max(0, contentLength - bodyAlreadyRead);

            // 6. Cross-Piping (client <-> backend)
            CountDownLatch responseCompleteLatch = new CountDownLatch(1);

            // If remaining request body needs to be piped
            if (remainingBodyToRead > 0) {
                final int bodyToPipe = remainingBodyToRead;
                final Socket bSocket = backendSocket;
                executor.submit(() -> {
                    try {
                        byte[] bodyBuffer = new byte[4096];
                        int totalPiped = 0;
                        while (totalPiped < bodyToPipe) {
                            int toRead = Math.min(bodyBuffer.length, bodyToPipe - totalPiped);
                            int r = clientIn.read(bodyBuffer, 0, toRead);
                            if (r == -1) break;
                            backendOut.write(bodyBuffer, 0, r);
                            backendOut.flush();
                            bytesInCounter.addAndGet(r);
                            totalPiped += r;
                        }
                    } catch (Exception ignored) {}
                });
            }

            // Backend -> Client Response Pumper
            InputStream backendIn = backendSocket.getInputStream();
            OutputStream clientOut = clientSocket.getOutputStream();

            // Read response
            byte[] respBuffer = new byte[8192];
            int r;
            boolean firstRead = true;

            while ((r = backendIn.read(respBuffer)) != -1) {
                if (firstRead) {
                    firstRead = false;
                    String respStr = new String(respBuffer, 0, Math.min(r, 100), StandardCharsets.ISO_8859_1);
                    String[] respLines = respStr.split("\r\n");
                    if (respLines.length > 0 && respLines[0].startsWith("HTTP/1.")) {
                        String[] respParts = respLines[0].split(" ");
                        if (respParts.length >= 2) {
                            try {
                                statusCode = Integer.parseInt(respParts[1]);
                            } catch (NumberFormatException ignored) {}
                        }
                    }
                }
                clientOut.write(respBuffer, 0, r);
                clientOut.flush();
                bytesOutCounter.addAndGet(r);
            }

            responseCompleteLatch.countDown();

        } catch (Exception e) {
            log.debug("Proxy connection error: {}", e.getMessage());
            statusCode = 502;
        } finally {
            long latencyMs = System.currentTimeMillis() - startTime;
            long bytesIn = bytesInCounter.get();
            long bytesOut = bytesOutCounter.get();

            if (backend != null) {
                backend.decrementActiveConnections();
                backend.addBytesIn(bytesIn);
                backend.addBytesOut(bytesOut);
            }

            // Clean up sockets in finally block
            try {
                if (backendSocket != null && !backendSocket.isClosed()) {
                    backendSocket.close();
                }
            } catch (Exception ignored) {}

            try {
                if (clientSocket != null && !clientSocket.isClosed()) {
                    clientSocket.close();
                }
            } catch (Exception ignored) {}

            // Emit structured events
            if (eventBus != null) {
                String bId = backend != null ? backend.getId() : null;
                String bName = backend != null ? backend.getName() : "none";
                int bPort = backend != null ? backend.getPort() : 0;
                eventBus.publish(ProxyEvent.connectionClosed(clientIp, bId, bytesIn, bytesOut, latencyMs));
                eventBus.publish(ProxyEvent.requestMetric(clientIp, method, path, pool, bId, bName, bPort, statusCode, latencyMs, bytesIn, bytesOut));
            }
        }
    }

    private int findHeaderEnd(byte[] data) {
        for (int i = 0; i < data.length - 3; i++) {
            if (data[i] == '\r' && data[i + 1] == '\n' && data[i + 2] == '\r' && data[i + 3] == '\n') {
                return i + 4;
            }
        }
        return -1;
    }

    private void sendHttpResponse(Socket socket, int code, String statusText, String body) {
        try {
            OutputStream out = socket.getOutputStream();
            byte[] bodyBytes = body.getBytes(StandardCharsets.UTF_8);
            String response = "HTTP/1.1 " + code + " " + statusText + "\r\n" +
                    "Content-Type: text/plain; charset=utf-8\r\n" +
                    "Content-Length: " + bodyBytes.length + "\r\n" +
                    "Connection: close\r\n" +
                    "\r\n";
            out.write(response.getBytes(StandardCharsets.US_ASCII));
            out.write(bodyBytes);
            out.flush();
        } catch (Exception ignored) {}
    }
}
