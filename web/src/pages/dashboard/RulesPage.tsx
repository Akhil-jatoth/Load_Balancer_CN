import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  GitBranch,
  Sliders,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit2,
  Check,
  Shield,
  Zap,
  Save
} from 'lucide-react';
import { RoutingRule, Settings } from '../../types';
import { useToast } from '../../components/ui/Toast';

export const RulesPage: React.FC = () => {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [settings, setSettings] = useState<Settings>({
    rateLimitRps: 20,
    healthCheckIntervalSec: 3,
    threadPoolSize: 200,
    proxyPort: 8080,
  });
  const [sliderVal, setSliderVal] = useState(20);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [formData, setFormData] = useState({
    pathPrefix: '',
    targetPool: 'api',
  });

  const { success, error } = useToast();

  const fetchData = async () => {
    try {
      const [rRes, sRes] = await Promise.all([
        fetch('/rules'),
        fetch('/settings'),
      ]);
      if (rRes.ok) setRules(await rRes.json());
      if (sRes.ok) {
        const s = await sRes.json();
        setSettings(s);
        setSliderVal(s.rateLimitRps);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveRateLimit = async () => {
    try {
      const res = await fetch('/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rateLimitRps: sliderVal }),
      });
      if (res.ok) {
        success('Rate Limit Hot-Reloaded', `Core engine limit set to ${sliderVal} req/s`);
        setSettings((prev) => ({ ...prev, rateLimitRps: sliderVal }));
      }
    } catch {
      error('Failed to update rate limit');
    }
  };

  const handleMoveRule = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= rules.length) return;

    const newRules = [...rules];
    const temp = newRules[index];
    newRules[index] = newRules[targetIdx];
    newRules[targetIdx] = temp;

    setRules(newRules);

    try {
      const res = await fetch('/rules/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRules),
      });
      if (res.ok) {
        success('Rules Reordered', 'Priority order updated in core router');
      }
    } catch {
      error('Failed to reorder rules');
      fetchData();
    }
  };

  const handleDeleteRule = async (id: string, prefix: string) => {
    if (!confirm(`Delete rule '${prefix}'?`)) return;
    try {
      const res = await fetch(`/rules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        success('Rule Deleted', `${prefix} removed`);
        fetchData();
      }
    } catch {
      error('Failed to delete rule');
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRule) {
        const res = await fetch(`/rules/${editingRule.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (res.ok) success('Rule Updated', `Updated '${formData.pathPrefix}'`);
      } else {
        const res = await fetch('/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (res.ok) success('Rule Added', `Created rule for '${formData.pathPrefix}'`);
      }
      setModalOpen(false);
      fetchData();
    } catch {
      error('Failed to save rule');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Rate Limiting Configuration Card */}
      <div className="p-6 rounded-xl bg-[#111622] border border-[#232D42] shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-[#232D42]">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-teal-400" />
              <span>Sliding Window Rate Limiter</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Per-client IP sliding 1-second window. Enforces HTTP 429 Too Many Requests when breached.
            </p>
          </div>
          <button
            onClick={handleSaveRateLimit}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs tracking-tight transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Apply Hot-Reload</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-slate-300">MAXIMUM PERMISSIBLE THROUGHPUT</span>
              <span className="text-teal-400 font-bold text-sm">{sliderVal} req / second</span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              value={sliderVal}
              onChange={(e) => setSliderVal(Number(e.target.value))}
              className="w-full accent-teal-400 h-1.5 bg-[#161C2A] rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>1 req/s (Strict)</span>
              <span>20 req/s (Default)</span>
              <span>50 req/s</span>
              <span>100 req/s (Permissive)</span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[#0B0E14] border border-[#232D42] font-mono text-xs space-y-1.5">
            <div className="flex justify-between text-slate-400">
              <span>Current Engine Limit:</span>
              <span className="text-white font-bold">{settings.rateLimitRps} rps</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Enforcement Code:</span>
              <span className="text-rose-400 font-bold">HTTP 429</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Algorithm:</span>
              <span className="text-teal-400">Sliding Window</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content-Based Routing Rules */}
      <div className="p-6 rounded-xl bg-[#111622] border border-[#232D42] shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-[#232D42]">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-teal-400" />
              <span>Content-Based Routing Rules</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Path prefixes matched in top-to-bottom order. Evaluates request line before backend socket dispatch.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingRule(null);
              setFormData({ pathPrefix: '/v2', targetPool: 'api' });
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs tracking-tight transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Routing Rule</span>
          </button>
        </div>

        <div className="space-y-2">
          {rules.map((rule, idx) => (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-3.5 rounded-lg bg-[#0B0E14] border border-[#232D42] hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-[#161C2A] text-slate-400 font-mono text-xs flex items-center justify-center font-bold">
                  {idx + 1}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-white">{rule.pathPrefix}*</span>
                    <span className="text-slate-500 font-mono text-xs">→</span>
                    <span className="text-xs font-mono font-semibold text-teal-400 px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/30">
                      pool: {rule.targetPool}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleMoveRule(idx, 'up')}
                  disabled={idx === 0}
                  className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-[#161C2A]"
                  title="Move Priority Up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleMoveRule(idx, 'down')}
                  disabled={idx === rules.length - 1}
                  className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-[#161C2A]"
                  title="Move Priority Down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setEditingRule(rule);
                    setFormData({ pathPrefix: rule.pathPrefix, targetPool: rule.targetPool });
                    setModalOpen(true);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-[#161C2A]"
                  title="Edit Rule"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteRule(rule.id, rule.pathPrefix)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-[#161C2A]"
                  title="Delete Rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}

          {/* Fallback rule indicator */}
          <div className="p-3 rounded-lg bg-[#0E121A]/50 border border-dashed border-[#232D42] flex items-center justify-between text-xs font-mono text-slate-500">
            <span>Fallback (Catch-All)</span>
            <span>→ pool: default</span>
          </div>
        </div>
      </div>

      {/* Rule Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-xl border border-[#232D42] bg-[#111622] text-slate-100 shadow-card">
            <h2 className="text-base font-bold text-white mb-1">
              {editingRule ? 'Edit Routing Rule' : 'Create Routing Rule'}
            </h2>
            <p className="text-xs text-slate-400 mb-5">Route requests matching path prefix to backend pool.</p>

            <form onSubmit={handleSaveRule} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Path Prefix</label>
                <input
                  type="text"
                  required
                  placeholder="/api"
                  value={formData.pathPrefix}
                  onChange={(e) => setFormData({ ...formData, pathPrefix: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded bg-[#161C2A] border border-[#232D42] focus:border-teal-400 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Pool</label>
                <select
                  value={formData.targetPool}
                  onChange={(e) => setFormData({ ...formData, targetPool: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded bg-[#161C2A] border border-[#232D42] focus:border-teal-400 focus:outline-none font-mono"
                >
                  <option value="api">api</option>
                  <option value="static">static</option>
                  <option value="default">default</option>
                </select>
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
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
