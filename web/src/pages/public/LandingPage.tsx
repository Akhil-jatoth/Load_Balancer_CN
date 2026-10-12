import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Layers,
  ArrowRight,
  Server,
  Activity,
  ShieldCheck,
  GitBranch,
  Radio,
  Terminal,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Cpu,
  Zap,
  Lock
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'curl' | 'wireshark' | 'stats'>('curl');

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 selection:bg-teal-500/20 selection:text-teal-300">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-[#232D42]/80 bg-[#0B0E14]/80 backdrop-blur px-6 lg:px-12 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
              <Layers className="w-4 h-4 text-teal-400" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              RELAY
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-400 font-mono border border-teal-500/20">
                v1.0
              </span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-white font-medium transition-colors"
          >
            Sign in
          </Link>
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs tracking-tight transition-colors"
          >
            <span>Live Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 px-6 lg:px-12 max-w-7xl mx-auto overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-teal-500/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="relative z-10 text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111622] border border-[#232D42] text-[11px] font-mono text-teal-400 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            <span>RAW JAVA BERKELEY SOCKETS • ZERO PROXY LIBRARIES</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            High-Performance TCP & HTTP <br />
            <span className="text-teal-400">Session Proxy & Load Balancer</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed mb-8 max-w-2xl mx-auto">
            Engineered from ground up with <code className="text-teal-300 font-mono text-xs px-1.5 py-0.5 rounded bg-slate-800">java.net.ServerSocket</code>.
            Content-based prefix routing, round-robin pool scheduling, sliding-window rate limiting, and real-time WebSocket telemetry.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-6 py-3 rounded-md bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs tracking-tight transition-all shadow-teal-glow"
            >
              <span>Explore Live Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/login"
              className="flex items-center gap-2 px-6 py-3 rounded-md bg-[#111622] hover:bg-[#161C2A] text-slate-200 border border-[#232D42] font-semibold text-xs tracking-tight transition-colors"
            >
              <Terminal className="w-4 h-4 text-teal-400" />
              <span>Operator Login (demo@relay.dev)</span>
            </Link>
          </div>
        </div>

        {/* Animated Network Topology Visual (SVG & Canvas) */}
        <div className="relative max-w-4xl mx-auto p-8 rounded-2xl bg-[#0E121A] border border-[#232D42] shadow-card">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#232D42] font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-bold">TOPOLOGY::ACTIVE_MESH</span>
            </div>
            <span className="text-slate-500">PORTS :8080 ⟶ :9001-:9004</span>
          </div>

          <div className="relative py-8">
            {/* SVG Connector Lines with Animated Packet Flows */}
            <svg className="w-full h-44 overflow-visible" viewBox="0 0 800 180">
              <defs>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#2DD4BF" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0.2" />
                </linearGradient>
              </defs>

              {/* Client -> Relay */}
              <line x1="120" y1="90" x2="350" y2="90" stroke="#232D42" strokeWidth="2" />
              <line
                x1="120"
                y1="90"
                x2="350"
                y2="90"
                stroke="#2DD4BF"
                strokeWidth="2"
                strokeDasharray="6 6"
                className="animate-packet-flow"
              />

              {/* Relay -> Backend 1 (:9001) */}
              <path d="M 450 90 C 530 90, 550 30, 650 30" fill="none" stroke="#232D42" strokeWidth="2" />
              <path
                d="M 450 90 C 530 90, 550 30, 650 30"
                fill="none"
                stroke="#2DD4BF"
                strokeWidth="2"
                strokeDasharray="6 6"
                className="animate-packet-flow"
              />

              {/* Relay -> Backend 2 (:9002) */}
              <path d="M 450 90 C 530 90, 550 70, 650 70" fill="none" stroke="#232D42" strokeWidth="2" />
              <path
                d="M 450 90 C 530 90, 550 70, 650 70"
                fill="none"
                stroke="#2DD4BF"
                strokeWidth="2"
                strokeDasharray="6 6"
                className="animate-packet-flow"
              />

              {/* Relay -> Backend 3 (:9003) */}
              <path d="M 450 90 C 530 90, 550 110, 650 110" fill="none" stroke="#232D42" strokeWidth="2" />
              <path
                d="M 450 90 C 530 90, 550 110, 650 110"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="2"
                strokeDasharray="6 6"
                className="animate-packet-flow"
              />

              {/* Relay -> Backend 4 (:9004) */}
              <path d="M 450 90 C 530 90, 550 150, 650 150" fill="none" stroke="#232D42" strokeWidth="2" />
              <path
                d="M 450 90 C 530 90, 550 150, 650 150"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="2"
                strokeDasharray="6 6"
                className="animate-packet-flow"
              />
            </svg>

            {/* Visual Node Badges (Absolute Placements) */}
            <div className="absolute left-6 top-1/2 -translate-y-1/2 w-28 p-3 rounded-lg bg-[#111622] border border-[#232D42] text-center shadow">
              <Radio className="w-4 h-4 text-teal-400 mx-auto mb-1" />
              <span className="text-[10px] font-mono font-bold block text-white">CLIENT</span>
              <span className="text-[9px] font-mono text-slate-400">SYN / ACK</span>
            </div>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-36 p-3.5 rounded-xl bg-[#0B0E14] border-2 border-teal-400 text-center shadow-teal-glow">
              <Layers className="w-5 h-5 text-teal-400 mx-auto mb-1" />
              <span className="text-xs font-mono font-bold block text-white">RELAY CORE</span>
              <span className="text-[10px] font-mono text-teal-300 font-semibold">:8080</span>
            </div>

            <div className="absolute right-6 top-1/2 -translate-y-1/2 space-y-2">
              <div className="w-32 py-1 px-2.5 rounded bg-[#111622] border border-teal-500/40 text-[10px] font-mono flex items-center justify-between">
                <span className="text-white">api-1</span>
                <span className="text-teal-400">:9001</span>
              </div>
              <div className="w-32 py-1 px-2.5 rounded bg-[#111622] border border-teal-500/40 text-[10px] font-mono flex items-center justify-between">
                <span className="text-white">api-2</span>
                <span className="text-teal-400">:9002</span>
              </div>
              <div className="w-32 py-1 px-2.5 rounded bg-[#111622] border border-sky-500/40 text-[10px] font-mono flex items-center justify-between">
                <span className="text-white">static-1</span>
                <span className="text-sky-400">:9003</span>
              </div>
              <div className="w-32 py-1 px-2.5 rounded bg-[#111622] border border-sky-500/40 text-[10px] font-mono flex items-center justify-between">
                <span className="text-white">static-2</span>
                <span className="text-sky-400">:9004</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works (3 Steps) */}
      <section id="how-it-works" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto border-t border-[#232D42]">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-mono text-teal-400 uppercase tracking-widest font-semibold">
            Under The Hood
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-2">
            How Relay Handles Every Connection
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
            Strict Berkeley socket lifecycle implementation executing in cached worker threads.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="p-6 rounded-xl bg-[#111622] border border-[#232D42] relative flex flex-col justify-between">
            <div>
              <span className="text-2xl font-mono font-extrabold text-teal-400/30 block mb-4">01</span>
              <h3 className="text-sm font-bold text-white mb-2">Accept & Rate Limit</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                The main loop accepts incoming client TCP connections via <code className="text-teal-300 font-mono">ServerSocket.accept()</code> and checks the client IP against a 1-second sliding window deque.
              </p>
            </div>
            <div className="p-2.5 rounded bg-[#0B0E14] border border-[#232D42] font-mono text-[11px] text-slate-400">
              <code>if (!limiter.tryAcquire(ip)) send429();</code>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-xl bg-[#111622] border border-[#232D42] relative flex flex-col justify-between">
            <div>
              <span className="text-2xl font-mono font-extrabold text-teal-400/30 block mb-4">02</span>
              <h3 className="text-sm font-bold text-white mb-2">Inspect & Match Rule</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Reads HTTP request line & headers until <code className="text-teal-300 font-mono">\r\n\r\n</code>. Matches path prefix against registered rules and selects next healthy backend via <code className="text-teal-300 font-mono">AtomicInteger</code> round-robin.
              </p>
            </div>
            <div className="p-2.5 rounded bg-[#0B0E14] border border-[#232D42] font-mono text-[11px] text-slate-400">
              <code>scheduler.selectBackend(pool, list);</code>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-xl bg-[#111622] border border-[#232D42] relative flex flex-col justify-between">
            <div>
              <span className="text-2xl font-mono font-extrabold text-teal-400/30 block mb-4">03</span>
              <h3 className="text-sm font-bold text-white mb-2">Cross-Pipe & Clean Up</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Opens backend socket, forwards buffered request, and spawns bi-directional streaming threads. Sockets are gracefully closed inside finally blocks with structured telemetry emitted.
              </p>
            </div>
            <div className="p-2.5 rounded bg-[#0B0E14] border border-[#232D42] font-mono text-[11px] text-slate-400">
              <code>finally &#123; client.close(); backend.close(); &#125;</code>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto border-t border-[#232D42]">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-mono text-teal-400 uppercase tracking-widest font-semibold">
            Engine Capabilities
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-2">
            Built For Low Latency & Resilience
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-5 rounded-xl bg-[#111622] border border-[#232D42]">
            <Activity className="w-5 h-5 text-teal-400 mb-3" />
            <h3 className="text-xs font-bold text-white uppercase font-mono mb-1.5">Round-Robin Scheduler</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Lock-free counter per pool using AtomicInteger. Automatically skips offline backends in O(1) time.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#111622] border border-[#232D42]">
            <Server className="w-5 h-5 text-emerald-400 mb-3" />
            <h3 className="text-xs font-bold text-white uppercase font-mono mb-1.5">Hysteresis Health Check</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Daemon runs TCP connect + GET /health every 3s. Marks DOWN after 2 failures, UP after 2 successes.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#111622] border border-[#232D42]">
            <ShieldCheck className="w-5 h-5 text-rose-400 mb-3" />
            <h3 className="text-xs font-bold text-white uppercase font-mono mb-1.5">Sliding Rate Limiter</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sliding 1-second window per client IP. Returns HTTP 429 Too Many Requests when threshold is exceeded.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#111622] border border-[#232D42]">
            <GitBranch className="w-5 h-5 text-sky-400 mb-3" />
            <h3 className="text-xs font-bold text-white uppercase font-mono mb-1.5">Content-Based Routing</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Runtime path prefix routing rules (/api -&gt; api pool, /static -&gt; static pool) editable without restart.
            </p>
          </div>
        </div>
      </section>

      {/* Terminal Demo Snippet */}
      <section id="terminal" className="py-20 px-6 lg:px-12 max-w-5xl mx-auto border-t border-[#232D42]">
        <div className="text-center mb-10">
          <span className="text-xs font-mono text-teal-400 uppercase tracking-widest font-semibold">
            Live Verification
          </span>
          <h2 className="text-2xl font-bold text-white mt-1">Terminal Demonstration</h2>
        </div>

        <div className="rounded-xl border border-[#232D42] bg-[#0E121A] overflow-hidden shadow-card font-mono text-xs">
          {/* Terminal Tabs */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#161C2A] border-b border-[#232D42]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="text-slate-400 text-[11px] ml-2">bash - relay-client</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('curl')}
                className={`px-2.5 py-1 rounded text-[11px] ${
                  activeTab === 'curl' ? 'bg-[#0E121A] text-teal-400 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                curl session
              </button>
              <button
                onClick={() => setActiveTab('wireshark')}
                className={`px-2.5 py-1 rounded text-[11px] ${
                  activeTab === 'wireshark' ? 'bg-[#0E121A] text-teal-400 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Wireshark Handshake
              </button>
            </div>
          </div>

          {/* Terminal Content */}
          <div className="p-6 overflow-x-auto space-y-3 leading-relaxed">
            {activeTab === 'curl' ? (
              <>
                <p className="text-slate-500"># 1. Request to /api/users (routed to API pool node 1)</p>
                <p className="text-white">
                  <span className="text-teal-400">$</span> curl -i http://localhost:8080/api/users
                </p>
                <div className="text-slate-300 pl-4 border-l border-slate-700 space-y-0.5">
                  <p><span className="text-emerald-400">HTTP/1.1 200 OK</span></p>
                  <p className="text-slate-400">X-Backend-Server: api-service-1</p>
                  <p className="text-slate-400">X-Backend-Port: 9001</p>
                  <p className="text-slate-400">Content-Type: application/json</p>
                  <p className="text-teal-300 mt-1">&#123;"message":"Processed by API Backend api-service-1","port":9001&#125;</p>
                </div>

                <p className="text-slate-500 pt-3"># 2. Second request immediately round-robined to node 2</p>
                <p className="text-white">
                  <span className="text-teal-400">$</span> curl -i http://localhost:8080/api/users
                </p>
                <div className="text-slate-300 pl-4 border-l border-slate-700 space-y-0.5">
                  <p><span className="text-emerald-400">HTTP/1.1 200 OK</span></p>
                  <p className="text-slate-400">X-Backend-Server: api-service-2</p>
                  <p className="text-slate-400">X-Backend-Port: 9002</p>
                  <p className="text-teal-300 mt-1">&#123;"message":"Processed by API Backend api-service-2","port":9002&#125;</p>
                </div>
              </>
            ) : (
              <>
                <p className="text-slate-500"># Wireshark Dual 3-Way Handshake Capture Trace</p>
                <p className="text-teal-400">1. Client ⟷ Relay Proxy (port 8080)</p>
                <div className="text-slate-300 pl-4 border-l border-teal-500/40 text-[11px] space-y-1">
                  <p>127.0.0.1:54321 ⟶ 127.0.0.1:8080 [SYN] Seq=0 Win=65535</p>
                  <p>127.0.0.1:8080 ⟶ 127.0.0.1:54321 [SYN, ACK] Seq=0 Ack=1</p>
                  <p>127.0.0.1:54321 ⟶ 127.0.0.1:8080 [ACK] Seq=1 Ack=1</p>
                </div>

                <p className="text-sky-400 pt-2">2. Relay Proxy ⟷ Backend Target (port 9001/9002)</p>
                <div className="text-slate-300 pl-4 border-l border-sky-500/40 text-[11px] space-y-1">
                  <p>127.0.0.1:54322 ⟶ 127.0.0.1:9001 [SYN] Seq=0 Win=65535</p>
                  <p>127.0.0.1:9001 ⟶ 127.0.0.1:54322 [SYN, ACK] Seq=0 Ack=1</p>
                  <p>127.0.0.1:54322 ⟶ 127.0.0.1:9001 [ACK] Seq=1 Ack=1</p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-[#232D42] px-6 lg:px-12 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
        <div className="flex items-center gap-2 text-slate-400">
          <Layers className="w-4 h-4 text-teal-400" />
          <span>RELAY LOAD BALANCER &bull; COMPUTER NETWORKS PROJECT</span>
        </div>
        <div>
          <span>Java 21 Raw Berkeley Sockets • SQLite • React & Vite</span>
        </div>
      </footer>
    </div>
  );
};
