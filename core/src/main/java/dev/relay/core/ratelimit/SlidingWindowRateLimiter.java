package dev.relay.core.ratelimit;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

public class SlidingWindowRateLimiter {
    private final AtomicInteger limit;
    private final long windowMillis;
    private final ConcurrentHashMap<String, Deque<Long>> requestWindows = new ConcurrentHashMap<>();

    public SlidingWindowRateLimiter() {
        this(20, 1000);
    }

    public SlidingWindowRateLimiter(int requestsPerSecond) {
        this(requestsPerSecond, 1000);
    }

    public SlidingWindowRateLimiter(int maxRequests, long windowMillis) {
        this.limit = new AtomicInteger(maxRequests);
        this.windowMillis = windowMillis;
    }

    public boolean tryAcquire(String clientIp) {
        return tryAcquire(clientIp, System.currentTimeMillis());
    }

    public boolean tryAcquire(String clientIp, long now) {
        if (clientIp == null) {
            clientIp = "unknown";
        }
        int maxLimit = limit.get();
        if (maxLimit <= 0) {
            return false; // limit of 0 blocks all
        }

        Deque<Long> window = requestWindows.computeIfAbsent(clientIp, k -> new ArrayDeque<>());
        synchronized (window) {
            long cutoff = now - windowMillis;
            while (!window.isEmpty() && window.peekFirst() <= cutoff) {
                window.pollFirst();
            }

            if (window.size() < maxLimit) {
                window.addLast(now);
                return true;
            } else {
                return false;
            }
        }
    }

    public int getCurrentRate(String clientIp) {
        return getCurrentRate(clientIp, System.currentTimeMillis());
    }

    public int getCurrentRate(String clientIp, long now) {
        if (clientIp == null) return 0;
        Deque<Long> window = requestWindows.get(clientIp);
        if (window == null) return 0;
        synchronized (window) {
            long cutoff = now - windowMillis;
            while (!window.isEmpty() && window.peekFirst() <= cutoff) {
                window.pollFirst();
            }
            return window.size();
        }
    }

    public int getLimit() {
        return limit.get();
    }

    public void setLimit(int newLimit) {
        this.limit.set(newLimit);
    }

    public void cleanExpired(long now) {
        long cutoff = now - windowMillis;
        requestWindows.entrySet().removeIf(entry -> {
            Deque<Long> q = entry.getValue();
            synchronized (q) {
                while (!q.isEmpty() && q.peekFirst() <= cutoff) {
                    q.pollFirst();
                }
                return q.isEmpty();
            }
        });
    }

    public void reset() {
        requestWindows.clear();
    }
}
