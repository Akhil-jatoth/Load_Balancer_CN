export type BackendStatus = 'UP' | 'DOWN' | 'CHECKING';

export interface Backend {
  id: string;
  name: string;
  host: string;
  port: number;
  pool: string;
  weight: number;
  enabled: boolean;
  status: BackendStatus;
  activeConnections: number;
  totalRequests: number;
  totalBytesIn: number;
  totalBytesOut: number;
  lastCheckTimestamp: number;
  lastResponseTimeMs: number;
  isDemoProcessRunning: boolean;
}

export interface RoutingRule {
  id: string;
  pathPrefix: string;
  targetPool: string;
  priority: number;
  enabled: boolean;
}

export interface Settings {
  rateLimitRps: number;
  healthCheckIntervalSec: number;
  threadPoolSize: number;
  proxyPort: number;
}

export interface MetricSummary {
  activeConnections: number;
  requestsPerSecond: number;
  avgLatencyMs: number;
  overallAvgLatencyMs: number;
  healthyBackends: number;
  totalBackends: number;
  blockedRequests: number;
  totalRequests: number;
  totalErrors: number;
  totalBytesIn: number;
  totalBytesOut: number;
  timestamp: number;
}

export interface MetricPoint {
  timestamp: number;
  requests: number;
  avgLatencyMs: number;
  errors: number;
  blocked: number;
}

export type ProxyEventType =
  | 'CONNECTION_OPENED'
  | 'CONNECTION_CLOSED'
  | 'ROUTE_DECISION'
  | 'BACKEND_STATE_CHANGE'
  | 'RATE_LIMIT_BLOCKED'
  | 'REQUEST_METRIC';

export interface ProxyEvent {
  id: string;
  timestamp: number;
  type: ProxyEventType;
  clientIp?: string;
  method?: string;
  path?: string;
  pool?: string;
  backendId?: string;
  backendName?: string;
  backendPort?: number;
  statusCode?: number;
  latencyMs?: number;
  bytesIn?: number;
  bytesOut?: number;
  details?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: number;
}

export interface TrafficStatus {
  active: boolean;
  targetRps: number;
  totalSent: number;
  totalSuccess: number;
  totalErrors: number;
  elapsedSec: number;
  remainingSec: number;
}
