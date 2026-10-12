package dev.relay.core.routing;

import dev.relay.core.model.RoutingRule;

import java.util.Comparator;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

public class ContentRouter {
    private final CopyOnWriteArrayList<RoutingRule> rules = new CopyOnWriteArrayList<>();
    private volatile String defaultPool = "default";

    public ContentRouter() {}

    public ContentRouter(List<RoutingRule> initialRules) {
        if (initialRules != null) {
            setRules(initialRules);
        }
    }

    public String route(String path) {
        if (path == null || path.isBlank()) {
            return defaultPool;
        }

        // Check rules in order of priority (ascending)
        for (RoutingRule rule : rules) {
            if (rule.matches(path)) {
                return rule.getTargetPool();
            }
        }

        return defaultPool;
    }

    public List<RoutingRule> getRules() {
        return rules.stream()
                .sorted(Comparator.comparingInt(RoutingRule::getPriority))
                .collect(Collectors.toList());
    }

    public void setRules(List<RoutingRule> newRules) {
        rules.clear();
        if (newRules != null) {
            List<RoutingRule> sorted = newRules.stream()
                    .sorted(Comparator.comparingInt(RoutingRule::getPriority))
                    .collect(Collectors.toList());
            rules.addAll(sorted);
        }
    }

    public void addRule(RoutingRule rule) {
        if (rule != null) {
            rules.add(rule);
            setRules(rules); // Resort
        }
    }

    public String getDefaultPool() {
        return defaultPool;
    }

    public void setDefaultPool(String defaultPool) {
        this.defaultPool = defaultPool;
    }
}
