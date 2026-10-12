import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Radio, RefreshCw, Trash2, ArrowDownUp, CheckCircle, AlertTriangle } from 'lucide-react';
import { ProxyEvent } from '../../types';
import { useWebSocket } from '../../context/WebSocketContext';

export const ConnectionsPage: React.FC = () => {
  const [connections, setConnections] = useState<ProxyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { recentEvents, clearEvents } = useWebSocket();

  const fetchConnections = async () => {
    try {
      const res = await fetch('/connections');
      if (res.ok) {
        setConnections(await res.json());
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
    if (!autoRefresh) return;
    const interval = setInterval(fetchConnections, 2000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Combine fetched connections with WebSocket real-time events
  const combined = [...recentEvents.filter(e => e.type === 'REQUEST_METRIC' || e.type === 'CONNECTION_OPENED'), ...connections];
  const uniqueConnections = Array.from(new Map(combined.map(c => [c.id, c])).values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 100);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#232D42]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Active & Recent Socket Streams
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-teal-500/10 text-teal-300 border border-teal-500/30">
              {uniqueConnections.length} Sessions
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time TCP cross-pipe telemetry streaming between client sockets and backend targets.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <label className="flex items-center gap-2 text-xs font-mono text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded bg-[#161C2A] border-[#232D42] text-teal-400 focus:ring-0"
            />
            <span>Auto-refresh</span>
          </label>
          <button
            onClick={fetchConnections}
            className="p-2 rounded border border-[#232D42] bg-[#111622] text-slate-400 hover:text-white transition-colors"
            title="Refresh stream list"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={clearEvents}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#232D42] bg-[#111622] text-slate-400 hover:text-rose-400 text-xs font-mono transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Buffer</span>
          </button>
        </div>
      </div>

      {/* Real-time Table */}
      <div className="rounded-xl border border-[#232D42] bg-[#111622] overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0B0E14] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#232D42]">
              <tr>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Client IP</th>
                <th className="py-3 px-4">Route / Path</th>
                <th className="py-3 px-4">Target Backend</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Bytes (In / Out)</th>
                <th className="py-3 px-4 text-right">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232D42]/60">
              {uniqueConnections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No active socket connections. Make a request to port 8080 or fire the load generator.
                  </td>
                </tr>
              ) : (
                uniqueConnections.map((c) => {
                  const date = new Date(c.timestamp);
                  const time = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`;
                  const isOk = c.statusCode ? c.statusCode >= 200 && c.statusCode < 400 : true;
                  const isBlocked = c.statusCode === 429;

                  return (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-[#161C2A]/60 transition-colors"
                    >
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{time}</td>
                      <td className="py-2.5 px-4 text-slate-300 font-semibold">{c.clientIp || '127.0.0.1'}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="text-teal-400 font-bold mr-1.5">{c.method || 'GET'}</span>
                        <span className="text-slate-200">{c.path || '/'}</span>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {c.backendName ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-200">{c.backendName}</span>
                            <span className="text-[10px] text-slate-500">:{c.backendPort}</span>
                            <span className="text-[10px] px-1 rounded bg-slate-800 text-teal-300">
                              {c.pool}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">none (blocked)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isBlocked
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : isOk
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {c.statusCode || 200}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-400 whitespace-nowrap">
                        <span className="text-slate-300">{c.bytesIn || 0}</span> / <span className="text-slate-300">{c.bytesOut || 0}</span> B
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <span className="text-teal-400 font-semibold">{c.latencyMs || 0} ms</span>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
