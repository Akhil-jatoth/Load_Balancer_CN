package dev.relay.api.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.relay.core.event.EventBus;
import dev.relay.core.model.ProxyEvent;
import io.javalin.websocket.WsConfig;
import io.javalin.websocket.WsContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public class LiveWebSocketHandler {
    private static final Logger log = LoggerFactory.getLogger(LiveWebSocketHandler.class);
    private static final ObjectMapper mapper = new ObjectMapper();

    private final EventBus eventBus;
    private final Set<WsContext> sessions = ConcurrentHashMap.newKeySet();

    public LiveWebSocketHandler(EventBus eventBus) {
        this.eventBus = eventBus;
        // Listen to events from the core proxy engine and broadcast
        this.eventBus.addListener(this::broadcastEvent);
    }

    public void configure(WsConfig ws) {
        ws.onConnect(ctx -> {
            sessions.add(ctx);
            log.info("WebSocket client connected: {}", ctx.sessionId());
            // Send welcome message
            Map<String, Object> welcome = Map.of(
                    "type", "CONNECTED",
                    "sessionId", ctx.sessionId(),
                    "timestamp", System.currentTimeMillis()
            );
            try {
                ctx.send(mapper.writeValueAsString(welcome));
            } catch (Exception ignored) {}
        });

        ws.onClose(ctx -> {
            sessions.remove(ctx);
            log.info("WebSocket client disconnected: {}", ctx.sessionId());
        });

        ws.onError(ctx -> {
            sessions.remove(ctx);
            log.warn("WebSocket client error {}: {}", ctx.sessionId(), ctx.error() != null ? ctx.error().getMessage() : "unknown");
        });

        ws.onMessage(ctx -> {
            // Heartbeat ping / pong
            String msg = ctx.message();
            if ("ping".equalsIgnoreCase(msg.trim())) {
                ctx.send("{\"type\":\"PONG\"}");
            }
        });
    }

    public void broadcastEvent(ProxyEvent event) {
        if (sessions.isEmpty() || event == null) return;

        try {
            String json = mapper.writeValueAsString(event);
            for (WsContext ctx : sessions) {
                try {
                    ctx.send(json);
                } catch (Exception e) {
                    sessions.remove(ctx);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to serialize proxy event: {}", e.getMessage());
        }
    }

    public int getConnectedCount() {
        return sessions.size();
    }
}
