package dev.relay.core.model;

public class RoutingRule {
    private String id;
    private String pathPrefix;
    private String targetPool;
    private int priority;
    private boolean enabled = true;

    public RoutingRule() {}

    public RoutingRule(String id, String pathPrefix, String targetPool, int priority) {
        this.id = id;
        this.pathPrefix = pathPrefix;
        this.targetPool = targetPool;
        this.priority = priority;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getPathPrefix() {
        return pathPrefix;
    }

    public void setPathPrefix(String pathPrefix) {
        this.pathPrefix = pathPrefix;
    }

    public String getTargetPool() {
        return targetPool;
    }

    public void setTargetPool(String targetPool) {
        this.targetPool = targetPool;
    }

    public int getPriority() {
        return priority;
    }

    public void setPriority(int priority) {
        this.priority = priority;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public boolean matches(String path) {
        if (!enabled || pathPrefix == null || path == null) {
            return false;
        }
        if (pathPrefix.equals("/")) {
            return true;
        }
        return path.startsWith(pathPrefix);
    }
}
