import React, { useEffect, useRef, useState } from 'react';
import {
  FileText,
  Search,
  Download,
  RefreshCw,
  Filter,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock
} from 'lucide-react';
import { ProxyEvent } from '../../types';
import { useWebSocket } from '../../context/WebSocketContext';
import { useToast } from '../../components/ui/Toast';

export const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<ProxyEvent[]>([]);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedBackend, setSelectedBackend] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [loading, setLoading] = useState(false);

  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const { recentEvents } = useWebSocket();
  const { success } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (selectedType) params.set('type', selectedType);
      if (selectedBackend) params.set('backend', selectedBackend);
      params.set('limit', '100');

      const res = await fetch(`/logs?${params.toString()}`);
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedType, selectedBackend]);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [logs, recentEvents, autoScroll]);

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['ID', 'Timestamp', 'Type', 'Client IP', 'Method', 'Path', 'Backend', 'Port', 'Status', 'LatencyMs', 'Details'];
    const rows = logs.map((l) => [
      l.id,
      new Date(l.timestamp).toISOString(),
      l.type,
      l.clientIp || '',
      l.method || '',
      l.path || '',
      l.backendName || '',
      l.backendPort || '',
      l.statusCode || '',
      l.latencyMs || '',
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relay-logs-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    success('Logs Exported', `Exported ${logs.length} telemetry records to CSV`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#232D42] shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Structured Event Telemetry
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-teal-500/10 text-teal-300 border border-teal-500/30">
              {logs.length} Records
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Persisted proxy state mutations, routing decisions, rate-limit enforcements, and TCP metrics.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <label className="flex items-center gap-2 text-xs font-mono text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded bg-[#161C2A] border-[#232D42] text-teal-400 focus:ring-0"
            />
            <span>Auto-pin</span>
          </label>

          <button
            onClick={fetchLogs}
            className="p-2 rounded border border-[#232D42] bg-[#111622] text-slate-400 hover:text-white transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#161C2A] hover:bg-[#1E2638] text-teal-300 border border-teal-500/30 text-xs font-mono transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search path, client IP, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md bg-[#111622] border border-[#232D42] text-slate-200 placeholder-slate-500 font-mono focus:border-teal-400 focus:outline-none"
          />
        </div>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="bg-[#111622] border border-[#232D42] text-xs font-mono text-slate-300 rounded-md px-3 py-1.5 focus:border-teal-400 focus:outline-none"
        >
          <option value="">All Event Types</option>
          <option value="REQUEST_METRIC">REQUEST_METRIC</option>
          <option value="ROUTE_DECISION">ROUTE_DECISION</option>
          <option value="BACKEND_STATE_CHANGE">BACKEND_STATE_CHANGE</option>
          <option value="RATE_LIMIT_BLOCKED">RATE_LIMIT_BLOCKED</option>
          <option value="CONNECTION_OPENED">CONNECTION_OPENED</option>
          <option value="CONNECTION_CLOSED">CONNECTION_CLOSED</option>
        </select>

        <select
          value={selectedBackend}
          onChange={(e) => setSelectedBackend(e.target.value)}
          className="bg-[#111622] border border-[#232D42] text-xs font-mono text-slate-300 rounded-md px-3 py-1.5 focus:border-teal-400 focus:outline-none"
        >
          <option value="">All Backends</option>
          <option value="api-service-1">api-service-1 (:9001)</option>
          <option value="api-service-2">api-service-2 (:9002)</option>
          <option value="static-service-1">static-service-1 (:9003)</option>
          <option value="static-service-2">static-service-2 (:9004)</option>
        </select>
      </div>

      {/* Monospace Log Viewer */}
      <div
        ref={logContainerRef}
        className="flex-1 rounded-xl border border-[#232D42] bg-[#0E121A] p-4 overflow-y-auto font-mono text-xs space-y-1.5 shadow-card"
      >
        {logs.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            No events found matching current criteria.
          </div>
        ) : (
          logs.map((log) => {
            const date = new Date(log.timestamp);
            const timeStr = `${date.toISOString().split('T')[1].replace('Z', '')}`;
            const isBlocked = log.type === 'RATE_LIMIT_BLOCKED';
            const isState = log.type === 'BACKEND_STATE_CHANGE';
            const isMetric = log.type === 'REQUEST_METRIC';

            return (
              <div
                key={log.id}
                className="flex items-start gap-3 py-1 px-2 rounded hover:bg-[#161C2A] text-slate-300 transition-colors leading-relaxed"
              >
                <span className="text-[11px] text-slate-500 shrink-0">{timeStr}</span>

                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-bold shrink-0 ${
                    isBlocked
                      ? 'bg-rose-500/20 text-rose-300'
                      : isState
                      ? 'bg-amber-500/20 text-amber-300'
                      : isMetric
                      ? 'bg-teal-500/20 text-teal-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {log.type}
                </span>

                <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2">
                  {log.clientIp && <span className="text-slate-400">[{log.clientIp}]</span>}
                  {log.method && <span className="text-teal-400 font-bold">{log.method}</span>}
                  {log.path && <span className="text-white font-medium">{log.path}</span>}
                  {log.backendName && (
                    <span className="text-slate-400">
                      → {log.backendName}:{log.backendPort}
                    </span>
                  )}
                  {log.statusCode && (
                    <span
                      className={`text-[11px] font-bold ${
                        log.statusCode === 429
                          ? 'text-rose-400'
                          : log.statusCode >= 200 && log.statusCode < 300
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      ({log.statusCode})
                    </span>
                  )}
                  {log.latencyMs !== undefined && log.latencyMs > 0 && (
                    <span className="text-sky-400 font-semibold">{log.latencyMs}ms</span>
                  )}
                  {log.details && <span className="text-slate-400">{log.details}</span>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
