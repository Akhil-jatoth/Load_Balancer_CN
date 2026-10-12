package dev.relay.core.event;

import dev.relay.core.model.ProxyEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.function.Consumer;

public class EventBus {
    private static final Logger log = LoggerFactory.getLogger(EventBus.class);
    private static final int MAX_QUEUE_SIZE = 10_000;
    private static final int MAX_RECENT_HISTORY = 500;

    private final BlockingQueue<ProxyEvent> eventQueue = new LinkedBlockingQueue<>(MAX_QUEUE_SIZE);
    private final CopyOnWriteArrayList<Consumer<ProxyEvent>> listeners = new CopyOnWriteArrayList<>();
    private final Object historyLock = new Object();
    private final List<ProxyEvent> recentEvents = new ArrayList<>();

    public void publish(ProxyEvent event) {
        if (event == null) return;

        // Offer to blocking queue for consumers
        if (!eventQueue.offer(event)) {
            // Queue full, drop oldest or log
            eventQueue.poll();
            eventQueue.offer(event);
        }

        // Add to recent ring buffer
        synchronized (historyLock) {
            recentEvents.add(event);
            if (recentEvents.size() > MAX_RECENT_HISTORY) {
                recentEvents.remove(0);
            }
        }

        // Notify active subscribers (e.g. WebSocket streamer)
        for (Consumer<ProxyEvent> listener : listeners) {
            try {
                listener.accept(event);
            } catch (Exception e) {
                log.warn("Error notifying event listener: {}", e.getMessage());
            }
        }
    }

    public void addListener(Consumer<ProxyEvent> listener) {
        listeners.add(listener);
    }

    public void removeListener(Consumer<ProxyEvent> listener) {
        listeners.remove(listener);
    }

    public BlockingQueue<ProxyEvent> getEventQueue() {
        return eventQueue;
    }

    public List<ProxyEvent> getRecentEvents() {
        synchronized (historyLock) {
            return new ArrayList<>(recentEvents);
        }
    }
}
