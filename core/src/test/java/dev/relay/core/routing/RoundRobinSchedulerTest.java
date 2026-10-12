package dev.relay.core.routing;

import dev.relay.core.model.Backend;
import dev.relay.core.model.BackendStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RoundRobinSchedulerTest {

    private RoundRobinScheduler scheduler;
    private List<Backend> backends;

    @BeforeEach
    void setUp() {
        scheduler = new RoundRobinScheduler();
        backends = new ArrayList<>();

        backends.add(new Backend("b1", "api-1", "127.0.0.1", 9001, "api"));
        backends.add(new Backend("b2", "api-2", "127.0.0.1", 9002, "api"));
        backends.add(new Backend("b3", "static-1", "127.0.0.1", 9003, "static"));
        backends.add(new Backend("b4", "default-1", "127.0.0.1", 9004, "default"));
    }

    @Test
    @DisplayName("Should alternate round-robin across healthy backends in pool")
    void testRoundRobinAlternation() {
        Backend first = scheduler.selectBackend("api", backends);
        Backend second = scheduler.selectBackend("api", backends);
        Backend third = scheduler.selectBackend("api", backends);

        assertNotNull(first);
        assertNotNull(second);
        assertNotNull(third);

        assertEquals("api-1", first.getName());
        assertEquals("api-2", second.getName());
        assertEquals("api-1", third.getName());
    }

    @Test
    @DisplayName("Should skip backends marked DOWN")
    void testSkipDownBackends() {
        // Mark api-1 DOWN
        backends.get(0).setStatus(BackendStatus.DOWN);

        Backend first = scheduler.selectBackend("api", backends);
        Backend second = scheduler.selectBackend("api", backends);

        assertEquals("api-2", first.getName());
        assertEquals("api-2", second.getName());
    }

    @Test
    @DisplayName("Should skip disabled backends")
    void testSkipDisabledBackends() {
        backends.get(0).setEnabled(false);

        Backend b = scheduler.selectBackend("api", backends);
        assertEquals("api-2", b.getName());
    }

    @Test
    @DisplayName("Should fallback to default pool if all target pool backends are DOWN")
    void testFallbackToDefault() {
        backends.get(0).setStatus(BackendStatus.DOWN);
        backends.get(1).setStatus(BackendStatus.DOWN);

        Backend b = scheduler.selectBackend("api", backends);
        assertNotNull(b);
        assertEquals("default-1", b.getName());
    }

    @Test
    @DisplayName("Should return null if all backends across all pools are DOWN")
    void testAllDownReturnsNull() {
        for (Backend b : backends) {
            b.setStatus(BackendStatus.DOWN);
        }

        Backend b = scheduler.selectBackend("api", backends);
        assertNull(b);
    }
}
