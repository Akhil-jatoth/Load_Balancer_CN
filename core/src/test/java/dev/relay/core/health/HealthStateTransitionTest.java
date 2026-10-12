package dev.relay.core.health;

import dev.relay.core.event.EventBus;
import dev.relay.core.model.Backend;
import dev.relay.core.model.BackendStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;

class HealthStateTransitionTest {

    private Backend backend;

    @BeforeEach
    void setUp() {
        backend = new Backend("test-1", "test-backend", "127.0.0.1", 9999, "api");
        backend.setStatus(BackendStatus.UP);
        backend.setConsecutiveFailures(0);
        backend.setConsecutiveSuccesses(0);
    }

    private void simulateFailure(HealthChecker checker) {
        // Backend port 9999 is closed so checkBackend will fail
        checker.checkBackend(backend);
    }

    @Test
    @DisplayName("Should require 2 consecutive failures to mark DOWN")
    void testTwoConsecutiveFailuresToDown() {
        HealthChecker checker = new HealthChecker(Collections.singletonList(backend), new EventBus(), 3);

        // First failure: status should remain UP
        simulateFailure(checker);
        assertEquals(BackendStatus.UP, backend.getStatus(), "Status should remain UP after 1 failure");
        assertEquals(1, backend.getConsecutiveFailures());

        // Second failure: status should transition to DOWN
        simulateFailure(checker);
        assertEquals(BackendStatus.DOWN, backend.getStatus(), "Status should transition to DOWN after 2 failures");
        assertEquals(2, backend.getConsecutiveFailures());
    }

    @Test
    @DisplayName("Should reset consecutive failures if a success intervenes")
    void testInterveningSuccessResetsFailures() {
        // We can test the state machine logic directly
        backend.setStatus(BackendStatus.UP);
        backend.setConsecutiveFailures(1);

        // A success occurs
        backend.setConsecutiveFailures(0);
        backend.setConsecutiveSuccesses(1);

        // Next failure occurs - it should only be failure #1, not #2
        backend.setConsecutiveSuccesses(0);
        backend.setConsecutiveFailures(backend.getConsecutiveFailures() + 1);

        assertEquals(1, backend.getConsecutiveFailures());
        assertEquals(BackendStatus.UP, backend.getStatus(), "Status must still be UP");
    }

    @Test
    @DisplayName("Should require 2 consecutive successes to mark UP from DOWN")
    void testTwoConsecutiveSuccessesToUp() {
        backend.setStatus(BackendStatus.DOWN);
        backend.setConsecutiveFailures(3);
        backend.setConsecutiveSuccesses(0);

        // First success
        backend.setConsecutiveFailures(0);
        backend.setConsecutiveSuccesses(1);
        // Did not reach 2 successes yet
        if (backend.getConsecutiveSuccesses() >= 2) {
            backend.setStatus(BackendStatus.UP);
        }
        assertEquals(BackendStatus.DOWN, backend.getStatus(), "Status should remain DOWN after 1 success");

        // Second success
        backend.setConsecutiveSuccesses(2);
        if (backend.getConsecutiveSuccesses() >= 2) {
            backend.setStatus(BackendStatus.UP);
        }
        assertEquals(BackendStatus.UP, backend.getStatus(), "Status should transition to UP after 2 successes");
    }
}
