package dev.relay.core.ratelimit;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SlidingWindowRateLimiterTest {

    @Test
    @DisplayName("Should allow requests up to limit and block requests exceeding limit")
    void testRateLimitEnforcement() {
        SlidingWindowRateLimiter limiter = new SlidingWindowRateLimiter(5, 1000);
        String ip = "192.168.1.10";
        long now = 1_000_000L;

        // First 5 requests should pass
        for (int i = 0; i < 5; i++) {
            assertTrue(limiter.tryAcquire(ip, now + (i * 10)), "Request " + (i + 1) + " should pass");
        }

        // 6th request within same window should be blocked
        assertFalse(limiter.tryAcquire(ip, now + 100), "Request 6 should be blocked");
        assertEquals(5, limiter.getCurrentRate(ip, now + 100));
    }

    @Test
    @DisplayName("Should allow requests again after sliding window moves past 1 second")
    void testSlidingWindowExpiration() {
        SlidingWindowRateLimiter limiter = new SlidingWindowRateLimiter(3, 1000);
        String ip = "10.0.0.1";
        long t0 = 10_000L;

        assertTrue(limiter.tryAcquire(ip, t0));
        assertTrue(limiter.tryAcquire(ip, t0 + 200));
        assertTrue(limiter.tryAcquire(ip, t0 + 400));
        assertFalse(limiter.tryAcquire(ip, t0 + 500)); // blocked

        // Advance time by 1001ms past t0
        assertTrue(limiter.tryAcquire(ip, t0 + 1005), "Should acquire after oldest request expired");
    }

    @Test
    @DisplayName("Should isolate rate limits per distinct IP address")
    void testPerIpIsolation() {
        SlidingWindowRateLimiter limiter = new SlidingWindowRateLimiter(2, 1000);
        String ip1 = "10.0.0.1";
        String ip2 = "10.0.0.2";
        long now = 5000L;

        assertTrue(limiter.tryAcquire(ip1, now));
        assertTrue(limiter.tryAcquire(ip1, now));
        assertFalse(limiter.tryAcquire(ip1, now));

        // ip2 should still be allowed
        assertTrue(limiter.tryAcquire(ip2, now));
        assertTrue(limiter.tryAcquire(ip2, now));
        assertFalse(limiter.tryAcquire(ip2, now));
    }

    @Test
    @DisplayName("Should dynamically update limit on hot-reload")
    void testDynamicLimitUpdate() {
        SlidingWindowRateLimiter limiter = new SlidingWindowRateLimiter(2, 1000);
        String ip = "127.0.0.1";
        long now = 1000L;

        assertTrue(limiter.tryAcquire(ip, now));
        assertTrue(limiter.tryAcquire(ip, now));
        assertFalse(limiter.tryAcquire(ip, now));

        // Hot-reload limit to 5
        limiter.setLimit(5);
        assertTrue(limiter.tryAcquire(ip, now));
        assertTrue(limiter.tryAcquire(ip, now));
        assertTrue(limiter.tryAcquire(ip, now));
        assertFalse(limiter.tryAcquire(ip, now));
    }
}
