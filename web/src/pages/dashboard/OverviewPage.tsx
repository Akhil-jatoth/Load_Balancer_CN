import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowUpRight,
  Clock,
  HardDrive,
  Radio,
  Server,
  ShieldAlert,
  Zap,
  Play,
  RotateCcw
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { Backend, MetricPoint, MetricSummary, ProxyEvent } from '../../types';
import { useWebSocket } from '../../context/WebSocketContext';
import { useToast } from '../../components/ui/Toast';

export const OverviewPage: React.FC = () => {
  const [summary, setSummary] = useState<MetricSummary | null>(null);
  const [timeseries, setTimeseries] = useState<MetricPoint[]>([]);
  const [backends, setBackends] = useState<Backend[]>([]);
  const [genRps, setGenRps] = useState(15);
  const [genDuration, setGenDuration] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);

  const { recentEvents, connected } = useWebSocket();
  const { success, error } = useToast();

  const fetchOverviewData = async () => {
    try {
      const [sumRes, timeRes, backRes] = await Promise.all([
        fetch('/metrics/summary'),
        fetch('/metrics/timeseries'),
        fetch('/backends'),
      ]);

      if (sumRes.ok) setSummary(await sumRes.json());
      if (timeRes.ok) setTimeseries(await timeRes.json());
      if (backRes.ok) setBackends(await backRes.json());
    } catch {}
  };

  useEffect(() => {
    fetchOverviewData();
    const interval = setInterval(fetchOverviewData, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleFireTraffic = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/traffic/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestsPerSecond: genRps,
          durationSec: genDuration,
          path: '/api/users',
        }),
      });
      if (res.ok) {
        success('Traffic Generator Fired', `Simulating ${genRps} req/s for ${genDuration}s via port 8080`);
      }
    } catch {
      error('Failed to trigger traffic generator');
    } finally {
      setTimeout(() => setIsGenerating(false), 2000);
    }
  };

  // Format chart time labels
  const formattedTimeseries = timeseries.map((pt) => {
    const d = new Date(pt.timestamp);
    return {
      ...pt,
      timeLabel: `${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`,
    };
  });

  const backendChartData = backends.map((b) => ({
    name: b.name.replace('-service', ''),
    port: b.port,
    requests: b.totalRequests,
    status: b.status,
    pool: b.pool,
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Traffic Trigger */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#232D42]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            Engine Telemetry
            <span className="text-[11px] px-2 py-0.5 rounded-full font-mono bg-teal-500/10 text-teal-300 border border-teal-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              SLIDING 1s WINDOW
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time proxy socket throughput, pool distribution, and health-state hysteresis.
          </p>
        </div>

        {/* Quick Traffic Injection Controls */}
        <div className="flex items-center gap-2.5 bg-[#111622] p-2 rounded-lg border border-[#232D42]">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300 px-2">
            <Zap className="w-3.5 h-3.5 text-teal-400" />
            <span>Simulate Load:</span>
          </div>
          <div className="flex items-center gap-1">
            <select
              value={genRps}
              onChange={(e) => setGenRps(Number(e.target.value))}
              className="bg-[#161C2A] border border-[#232D42] text-xs font-mono text-slate-200 rounded px-2 py-1 focus:outline-none focus:border-teal-400"
            >
              <option value={5}>5 req/s</option>
              <option value={15}>15 req/s</option>
              <option value={30}>30 req/s (exceeds limit)</option>
              <option value={50}>50 req/s (heavy burst)</option>
            </select>
            <select
              value={genDuration}
              onChange={(e) => setGenDuration(Number(e.target.value))}
              className="bg-[#161C2A] border border-[#232D42] text-xs font-mono text-slate-200 rounded px-2 py-1 focus:outline-none focus:border-teal-400"
            >
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={20}>20s</option>
            </select>
          </div>
          <button
            onClick={handleFireTraffic}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs rounded transition-colors disabled:opacity-50"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Fire</span>
          </button>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Card 1: Requests/sec */}
        <div className="p-4 rounded-lg bg-[#111622] border border-[#232D42]">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide">THROUGHPUT</span>
            <Activity className="w-4 h-4 text-teal-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {summary?.requestsPerSecond ?? 0}
            </span>
            <span className="text-xs font-mono text-slate-400">req/s</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono mt-2 truncate">
            Total {summary?.totalRequests?.toLocaleString() ?? 0} requests
          </p>
        </div>

        {/* Card 2: Avg Latency */}
        <div className="p-4 rounded-lg bg-[#111622] border border-[#232D42]">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide">AVG LATENCY</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {summary?.avgLatencyMs ?? 0}
            </span>
            <span className="text-xs font-mono text-slate-400">ms</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono mt-2 truncate">
            Overall {summary?.overallAvgLatencyMs ?? 0} ms
          </p>
        </div>

        {/* Card 3: Healthy Backends */}
        <div className="p-4 rounded-lg bg-[#111622] border border-[#232D42]">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide">BACKEND HEALTH</span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
              {summary?.healthyBackends ?? 0}
            </span>
            <span className="text-xs font-mono text-slate-400">/ {summary?.totalBackends ?? 4} UP</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono mt-2 truncate">
            3s interval • 1s timeout
          </p>
        </div>

        {/* Card 4: Active Connections */}
        <div className="p-4 rounded-lg bg-[#111622] border border-[#232D42]">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide">ACTIVE PIPES</span>
            <Radio className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {summary?.activeConnections ?? 0}
            </span>
            <span className="text-xs font-mono text-slate-400">open</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono mt-2 truncate">
            CachedThreadPool managed
          </p>
        </div>

        {/* Card 5: Blocked (429) */}
        <div className="p-4 rounded-lg bg-[#111622] border border-[#232D42] col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide">RATE LIMITED</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-rose-400 tracking-tight">
              {summary?.blockedRequests ?? 0}
            </span>
            <span className="text-xs font-mono text-slate-400">429s</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono mt-2 truncate">
            Sliding 1s IP limit
          </p>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Throughput & Latency Chart */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-[#111622] border border-[#232D42]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs font-bold tracking-tight text-white uppercase font-mono">
                Real-Time Traffic Throughput & Latency
              </h2>
              <p className="text-[11px] text-slate-400">Requests per second (teal) & latency in ms (sky)</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="flex items-center gap-1.5 text-teal-400">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400" /> Req/s
              </span>
              <span className="flex items-center gap-1.5 text-sky-400">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> Latency (ms)
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedTimeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#38BDF8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="timeLabel" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono',
                  }}
                />
                <Area type="monotone" dataKey="requests" stroke="#2DD4BF" strokeWidth={2} fillOpacity={1} fill="url(#tealGrad)" />
                <Area type="monotone" dataKey="avgLatencyMs" stroke="#38BDF8" strokeWidth={1.5} fillOpacity={1} fill="url(#skyGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Traffic Per Backend Bar Chart */}
        <div className="p-5 rounded-xl bg-[#111622] border border-[#232D42] flex flex-col">
          <div className="mb-4">
            <h2 className="text-xs font-bold tracking-tight text-white uppercase font-mono">
              Backend Traffic Distribution
            </h2>
            <p className="text-[11px] text-slate-400">Total requests routed per active mock server</p>
          </div>

          <div className="h-64 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={backendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono',
                  }}
                />
                <Bar dataKey="requests" fill="#2DD4BF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="p-5 rounded-xl bg-[#111622] border border-[#232D42]">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#232D42]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400" />
            </span>
            <h2 className="text-xs font-bold tracking-tight text-white uppercase font-mono">
              Live Socket Event Stream
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {connected ? 'WebSocket connected' : 'Connecting...'}
          </span>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto font-mono text-xs pr-1">
          {recentEvents.length === 0 ? (
            <p className="text-slate-500 py-6 text-center text-xs">Waiting for incoming proxy connections...</p>
          ) : (
            recentEvents.slice(0, 15).map((e) => {
              const time = new Date(e.timestamp).toLocaleTimeString();
              const isBlocked = e.type === 'RATE_LIMIT_BLOCKED';
              const isStateChange = e.type === 'BACKEND_STATE_CHANGE';
              const isMetric = e.type === 'REQUEST_METRIC';

              return (
                <div
                  key={e.id}
                  className="flex items-center justify-between py-1.5 px-2.5 rounded bg-[#0B0E14] border border-[#232D42]/60 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="text-[10px] text-slate-500 shrink-0">{time}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                        isBlocked
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : isStateChange
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : isMetric
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {e.type}
                    </span>
                    <span className="text-slate-300 truncate text-[11px]">
                      {e.details || `${e.method} ${e.path} -> ${e.backendName}:${e.backendPort}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-400">
                    {e.latencyMs !== undefined && e.latencyMs > 0 && (
                      <span className="text-teal-400">{e.latencyMs}ms</span>
                    )}
                    {e.clientIp && <span className="text-slate-500">{e.clientIp}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
