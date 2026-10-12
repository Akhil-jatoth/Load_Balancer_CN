package dev.relay.core.model;

public enum ProxyEventType {
    CONNECTION_OPENED,
    CONNECTION_CLOSED,
    ROUTE_DECISION,
    BACKEND_STATE_CHANGE,
    RATE_LIMIT_BLOCKED,
    REQUEST_METRIC
}
