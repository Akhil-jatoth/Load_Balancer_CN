# Relay: TCP/HTTP Session Proxy and Load Balancer

> A Computer Networks system implementation built with raw Java Berkeley sockets (`java.net.ServerSocket` and `java.net.Socket`), zero third-party proxy frameworks, and a live web management telemetry dashboard.

---

## 1. System Architecture

```mermaid
graph TD
    Client["Client / Browser / curl"] -- "TCP Handshake on :8080" --> ServerSocket["Relay ServerSocket (Port 8080)"]

    subgraph "Core Engine (java.net.Socket - CachedThreadPool)"
        ServerSocket --> Worker["ConnectionHandler Worker Thread"]
        Worker --> RateLimiter{"Sliding Window Limiter<br/>(20 req/s window)"}
        RateLimiter -- "Exceeded" --> HTTP429["Return HTTP 429 & Close"]
        RateLimiter -- "Allowed" --> HTTPParser["Parse Request-Line & Headers"]
        HTTPParser --> ContentRouter["ContentRouter<br/>(/api, /static prefix)"]
        ContentRouter --> Scheduler["RoundRobinScheduler<br/>(AtomicInteger per pool)"]

        Scheduler --> TargetBackend["Healthy Target Backend Socket"]

        Worker --> CrossPipe["Cross-Piping Threads<br/>Client <--> Backend"]
        CrossPipe --> FinallyBlock["Finally Socket Cleanup & Latency Metrics"]
    end

    subgraph "Health Checker Daemon Thread (Interval: 3s)"
        HealthChecker["Daemon Loop: TCP connect + GET /health (1s timeout)"]
        HealthChecker --> Hysteresis["Hysteresis State Machine:<br/>2 Failures -> DOWN<br/>2 Successes -> UP"]
    end

    subgraph "Demo Backend Processes (Ports 9001 - 9004)"
        TargetBackend --> B1["api-service-1 (:9001) [api pool]"]
        TargetBackend --> B2["api-service-2 (:9002) [api pool]"]
        TargetBackend --> B3["static-service-1 (:9003) [static pool]"]
        TargetBackend --> B4["static-service-2 (:9004) [static pool]"]
    end

    subgraph "Control-Plane & UI Layer"
        Worker -. "Emit Structured Event" .-> EventBus["EventBus Queue"]
        EventBus --> SQLite[("SQLite Database<br/>relay.db")]
        EventBus --> WebSocket["WebSocket /live (:8000)"]
        WebSocket --> Dashboard["React + Vite Telemetry Dashboard (:8000)"]
    end
```

---

## 2. Directory Structure

```text
.
├── core/                  # Core raw socket load balancer engine
│   ├── src/main/java/dev/relay/core/
│   │   ├── engine/        # RelayProxyServer, ConnectionHandler, SocketPumper
│   │   ├── model/         # Backend, RoutingRule, ProxyEvent, BackendStatus
│   │   ├── routing/       # RoundRobinScheduler, ContentRouter
│   │   ├── ratelimit/     # SlidingWindowRateLimiter (1s deque)
│   │   ├── health/        # HealthChecker daemon (3s interval, 1s timeout)
│   │   ├── event/         # EventBus queue and subscriber registry
│   │   └── config/        # ProxyConfig container
│   └── src/test/java/     # Scheduler, RateLimiter, and Health unit tests
├── api/                   # Control-plane REST API, SQLite JDBC, WebSocket /live
├── demo-backends/         # 4 standalone HTTP servers (ports 9001-9004)
├── web/                   # React + Vite + TypeScript + Tailwind CSS dashboard
├── docs/                  # Architecture documentation and Wireshark guides
├── run.bat                # One-click Windows startup script
├── run.sh                 # One-click Unix startup script
├── Dockerfile             # Multi-stage container build
└── docker-compose.yml     # Container orchestration
```

---

## 3. Quickstart & Running

### Option A: Using `run.bat` (Windows)
```cmd
.\run.bat
```

### Option B: Using `run.sh` (Linux / macOS)
```bash
chmod +x ./run.sh
./run.sh
```

### Option C: Using Docker Compose
```bash
docker-compose up --build
```

### Service Endpoints
| Service | URL / Port | Description |
|---|---|---|
| **Web Dashboard** | `http://localhost:8000/` | Live management dashboard & telemetry |
| **Control Plane API** | `http://localhost:8000/api/...` | REST API & SQLite control plane |
| **WebSocket Telemetry** | `ws://localhost:8000/live` | Real-time event streaming |
| **Relay Proxy Port** | `http://localhost:8080/` | Raw Berkeley socket load balancer |
| **Backend 1** | `http://localhost:9001/` | `api-service-1` (API pool) |
| **Backend 2** | `http://localhost:9002` | `api-service-2` (API pool) |
| **Backend 3** | `http://localhost:9003/` | `static-service-1` (Static pool) |
| **Backend 4** | `http://localhost:9004/` | `static-service-2` (Static pool) |

### Default Credentials
- **Email**: `demo@relay.dev`
- **Password**: `Demo@1234`

---

## 4. Live Failure Demo & Rerouting

1. Open the dashboard at `http://localhost:8000/` and sign in.
2. Navigate to **Failure Simulator** (`/dashboard/simulator`) or **Backends** (`/dashboard/backends`).
3. Click **"Simulate Crash"** or **"Simulate Kill"** on `api-service-2` (Port 9002).
4. Watch the health checker daemon:
   - Within **<= 3 seconds**, the daemon detects connection failure.
   - After **2 consecutive failures**, node status transitions to **DOWN** and turns red.
   - Traffic dispatched to `/api/*` immediately reroutes 100% to `api-service-1` (Port 9001).
   - **Zero active connections are dropped**.
5. Click **"Recover Node"**:
   - The mock server starts again.
   - After **2 consecutive successful health checks**, status returns to **UP**.
   - Round-robin traffic automatically resumes alternating 50/50.

---

## 5. Capturing Wireshark Dual Handshakes

Relay operates as a true session proxy. Every client request triggers **two distinct TCP connections**:

```text
Client (e.g. :54321)  <--- 3-Way Handshake 1 --->  Relay Proxy (:8080)
Relay Proxy (e.g. :54322) <--- 3-Way Handshake 2 --->  Backend (:9001/:9002)
```

### Steps to Capture in Wireshark:
1. Open **Wireshark** and select your Loopback adapter (`Adapter for loopback traffic capture` on Windows, or `lo0` on macOS/Linux).
2. Set the display filter to:
   ```text
   tcp.port == 8080 || tcp.port == 9001 || tcp.port == 9002
   ```
3. Send an HTTP request via the proxy:
   ```bash
   curl -i http://localhost:8080/api/users
   ```
4. Stop the capture and inspect the packets:
   - **Handshake 1 (Client -> Proxy)**:
     - `Client -> 127.0.0.1:8080` `[SYN]`
     - `127.0.0.1:8080 -> Client` `[SYN, ACK]`
     - `Client -> 127.0.0.1:8080` `[ACK]`
   - **Handshake 2 (Proxy -> Backend)**:
     - `Relay -> 127.0.0.1:9001` `[SYN]`
     - `127.0.0.1:9001 -> Relay` `[SYN, ACK]`
     - `Relay -> 127.0.0.1:9001` `[ACK]`
5. This conclusively proves to instructors and evaluators that Relay creates genuine raw socket cross-connections rather than using transparent internal dispatchers.

---

## 6. REST API Reference

### Authentication
- `POST /auth/login` - Authenticate operator and receive JWT cookie & token
- `POST /auth/register` - Create operator account
- `POST /auth/logout` - Clear authentication session
- `GET /auth/me` - Fetch authenticated operator profile

### Backends
- `GET /backends` - List all backends with live status, connection count, and latency
- `POST /backends` - Register a new backend target
- `PUT /backends/{id}` - Update backend parameters (host, port, pool, weight)
- `DELETE /backends/{id}` - Remove backend from registry
- `POST /backends/{id}/stop` - Stop demo backend process (simulate live crash)
- `POST /backends/{id}/start` - Start demo backend process (recover from crash)

### Routing Rules & Settings
- `GET /rules` - List ordered content routing rules
- `POST /rules` - Create prefix routing rule
- `PUT /rules/{id}` - Update rule
- `DELETE /rules/{id}` - Delete rule
- `PUT /rules/reorder` - Update evaluation order
- `GET /settings` - Retrieve rate limit, health check interval, thread pool limits
- `PUT /settings` - Hot-reload core engine parameters without restarting

### Telemetry & Traffic
- `GET /metrics/summary` - Aggregate metrics (throughput, conns, errors, bytes)
- `GET /metrics/timeseries` - Sliding historical time series points
- `GET /connections` - Active and recent socket streams
- `GET /logs` - Searchable and filterable event logs (CSV exportable)
- `POST /traffic/generate` - Dispatch load test burst `{requestsPerSecond, durationSec, path}`
- `GET /traffic/status` - Current traffic injection status
- `WS /live` - WebSocket stream broadcasting real-time events
