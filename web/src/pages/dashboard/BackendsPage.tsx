import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server,
  Play,
  Square,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { Backend } from '../../types';
import { useToast } from '../../components/ui/Toast';

export const BackendsPage: React.FC = () => {
  const [backends, setBackends] = useState<Backend[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBackend, setEditingBackend] = useState<Backend | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    host: '127.0.0.1',
    port: 9005,
    pool: 'api',
    weight: 1,
  });

  const { success, error, warning } = useToast();

  const fetchBackends = async () => {
    try {
      const res = await fetch('/backends');
      if (res.ok) {
        setBackends(await res.json());
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackends();
    const interval = setInterval(fetchBackends, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleSimulation = async (backend: Backend) => {
    const isRunning = backend.isDemoProcessRunning;
    const endpoint = isRunning ? `/backends/${backend.id}/stop` : `/backends/${backend.id}/start`;
    setActionLoading((prev) => ({ ...prev, [backend.id]: true }));

    try {
      const res = await fetch(endpoint, { method: 'POST' });
      if (res.ok) {
        if (isRunning) {
          warning(
            `Killed Demo Process: ${backend.name}`,
            `Port ${backend.port} closed. Health checker will detect DOWN in <= 3s.`
          );
        } else {
          success(
            `Started Demo Process: ${backend.name}`,
            `Port ${backend.port} open. Health checker will recover to UP after 2 passes.`
          );
        }
        await fetchBackends();
      }
    } catch {
      error(`Failed to change process state for ${backend.name}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [backend.id]: false }));
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete backend ${name}?`)) return;
    try {
      const res = await fetch(`/backends/${id}`, { method: 'DELETE' });
      if (res.ok) {
        success('Backend Removed', `${name} deleted from config`);
        fetchBackends();
      }
    } catch {
      error('Failed to delete backend');
    }
  };

  const handleOpenAdd = () => {
    setEditingBackend(null);
    setFormData({
      name: `custom-service-${backends.length + 1}`,
      host: '127.0.0.1',
      port: 9000 + backends.length + 1,
      pool: 'api',
      weight: 1,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (b: Backend) => {
    setEditingBackend(b);
    setFormData({
      name: b.name,
      host: b.host,
      port: b.port,
      pool: b.pool,
      weight: b.weight,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBackend) {
        const res = await fetch(`/backends/${editingBackend.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          success('Backend Updated', `${formData.name} updated`);
        }
      } else {
        const res = await fetch('/backends', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          success('Backend Created', `${formData.name} added to ${formData.pool} pool`);
        }
      }
      setModalOpen(false);
      fetchBackends();
    } catch {
      error('Failed to save backend');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#232D42]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Backend Server Registry
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-teal-500/10 text-teal-300 border border-teal-500/30">
              {backends.length} Nodes
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Registered HTTP servers monitored by raw Berkeley TCP health checker daemon.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchBackends}
            className="p-2 rounded border border-[#232D42] bg-[#111622] text-slate-400 hover:text-white transition-colors"
            title="Refresh backend statuses"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs tracking-tight transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Backend</span>
          </button>
        </div>
      </div>

      {/* Backend Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {backends.map((b) => {
          const isUp = b.status === 'UP';
          const isChecking = b.status === 'CHECKING';
          const isBusy = actionLoading[b.id];

          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-xl bg-[#111622] border border-[#232D42] shadow-card hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#161C2A] border border-[#232D42] flex items-center justify-center shrink-0">
                      <Server className="w-4 h-4 text-teal-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                        {b.name}
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          :{b.port}
                        </span>
                      </h3>
                      <p className="text-[11px] font-mono text-slate-400">
                        {b.host} • Pool: <span className="text-teal-400 font-semibold">{b.pool}</span>
                      </p>
                    </div>
                  </div>

                  {/* Status Pill with Pulsing Dot */}
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border ${
                      isUp
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : isChecking
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isUp ? 'bg-emerald-400 animate-pulse' : isChecking ? 'bg-amber-400' : 'bg-rose-500'
                      }`}
                    />
                    <span>{b.status}</span>
                  </div>
                </div>

                {/* Metrics detail grid */}
                <div className="grid grid-cols-3 gap-2 py-3 my-3 border-y border-[#232D42]/60 font-mono text-xs">
                  <div className="p-2 rounded bg-[#0B0E14] border border-[#232D42]/40">
                    <span className="text-[10px] text-slate-500 block">ACTIVE CONNS</span>
                    <span className="text-sm font-bold text-slate-200">{b.activeConnections}</span>
                  </div>
                  <div className="p-2 rounded bg-[#0B0E14] border border-[#232D42]/40">
                    <span className="text-[10px] text-slate-500 block">TOTAL REQS</span>
                    <span className="text-sm font-bold text-slate-200">{b.totalRequests.toLocaleString()}</span>
                  </div>
                  <div className="p-2 rounded bg-[#0B0E14] border border-[#232D42]/40">
                    <span className="text-[10px] text-slate-500 block">HEALTH LATENCY</span>
                    <span className="text-sm font-bold text-teal-400">{b.lastResponseTimeMs}ms</span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleSimulation(b)}
                    disabled={isBusy}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all ${
                      b.isDemoProcessRunning
                        ? 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30'
                        : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30'
                    }`}
                    title={
                      b.isDemoProcessRunning
                        ? 'Stop backend to simulate failure'
                        : 'Start backend process to recover'
                    }
                  >
                    {isBusy ? (
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : b.isDemoProcessRunning ? (
                      <>
                        <Square className="w-3 h-3 fill-current" />
                        <span>Simulate Kill</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        <span>Restart Node</span>
                      </>
                    )}
                  </button>

                  <span className="text-[10px] font-mono text-slate-500">
                    Process: {b.isDemoProcessRunning ? 'RUNNING' : 'STOPPED'}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(b)}
                    className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-[#161C2A] transition-colors"
                    title="Edit configuration"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(b.id, b.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-[#161C2A] transition-colors"
                    title="Delete backend"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Add / Edit Backend Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-xl border border-[#232D42] bg-[#111622] text-slate-100 shadow-card"
            >
              <h2 className="text-base font-bold text-white mb-1">
                {editingBackend ? 'Edit Backend Server' : 'Add Backend Server'}
              </h2>
              <p className="text-xs text-slate-400 mb-5">Configure socket target and routing pool.</p>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Backend Identifier</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded bg-[#161C2A] border border-[#232D42] focus:border-teal-400 focus:outline-none font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Host / IP</label>
                    <input
                      type="text"
                      required
                      value={formData.host}
                      onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded bg-[#161C2A] border border-[#232D42] focus:border-teal-400 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Port</label>
                    <input
                      type="number"
                      required
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs rounded bg-[#161C2A] border border-[#232D42] focus:border-teal-400 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Pool</label>
                    <select
                      value={formData.pool}
                      onChange={(e) => setFormData({ ...formData, pool: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded bg-[#161C2A] border border-[#232D42] focus:border-teal-400 focus:outline-none font-mono"
                    >
                      <option value="api">api</option>
                      <option value="static">static</option>
                      <option value="default">default</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Weight</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs rounded bg-[#161C2A] border border-[#232D42] focus:border-teal-400 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-[#232D42]">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white rounded border border-[#232D42] hover:bg-[#161C2A]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold rounded bg-teal-500 hover:bg-teal-400 text-slate-950 transition-colors"
                  >
                    Save Backend
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
