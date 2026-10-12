# Relay: TCP/HTTP Session Proxy and Load Balancer

[![Core: Raw Java Sockets](https://img.shields.io/badge/Core-Java%2021%20Berkeley%20Sockets-teal.svg)](file:///e:/AJ/CN/CN_2/core)
[![Control Plane: Javalin](https://img.shields.io/badge/API-Javalin%206%20%2B%20SQLite-0284c7.svg)](file:///e:/AJ/CN/CN_2/api)
[![Dashboard: React + Vite](https://img.shields.io/badge/Dashboard-React%2018%20%2B%20Tailwind-14b8a6.svg)](file:///e:/AJ/CN/CN_2/web)
[![License: MIT](https://img.shields.io/badge/License-MIT-slate.svg)](LICENSE)

A production-quality Computer Networks project implementing a TCP/HTTP session proxy and load balancer from scratch using raw Java Berkeley sockets (`java.net.ServerSocket` and `java.net.Socket`). Zero third-party proxy frameworks (no Netty, no Spring Cloud Gateway, no Envoy).

For detailed documentation, architecture diagrams, Wireshark instructions, and full API references, see [docs/README.md](file:///e:/AJ/CN/CN_2/docs/README.md).

---

## Quickstart

### Windows
```cmd
.\run.bat
```

### Linux / macOS
```bash
./run.sh
```

### Docker
```bash
docker-compose up --build
```

---

## Endpoints & Access
- **Live Dashboard**: [http://localhost:8000/](http://localhost:8000/)
- **Core Proxy**: [http://localhost:8080/](http://localhost:8080/)
  - `/api/*` -> API Pool (`:9001`, `:9002`)
  - `/static/*` -> Static Pool (`:9003`, `:9004`)
- **Demo Operator**: `demo@relay.dev` / `Demo@1234`
