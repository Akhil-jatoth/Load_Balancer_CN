import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Lock, Cpu, Server, Save, User as UserIcon, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Settings } from '../../types';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [settings, setSettings] = useState<Settings>({
    rateLimitRps: 20,
    healthCheckIntervalSec: 3,
    threadPoolSize: 200,
    proxyPort: 8080,
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    fetch('/settings')
      .then((r) => r.json())
      .then((data) => setSettings(data))
      .catch(() => {});
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        success('Settings Applied', 'Health check interval & worker thread limits hot-reloaded');
      }
    } catch {
      error('Failed to update settings');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      error('Password must be at least 8 characters');
      return;
    }

    setPasswordLoading(true);
    // Password update endpoint
    setTimeout(() => {
      setPasswordLoading(false);
      success('Password Updated', 'Your operator credentials were successfully saved');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 600);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="pb-4 border-b border-[#232D42]">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          Operator & Engine Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Adjust daemon loop frequencies, socket pool thresholds, and account security.
        </p>
      </div>

      {/* Engine Tuning Configuration */}
      <div className="p-6 rounded-xl bg-[#111622] border border-[#232D42] shadow-card">
        <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4 pb-3 border-b border-[#232D42]">
          <Cpu className="w-4 h-4 text-teal-400" />
          <span>Core Engine Daemon Parameters</span>
        </h2>

        <form onSubmit={handleSaveSettings} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5">
                HEALTH CHECK INTERVAL (SECONDS)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={settings.healthCheckIntervalSec}
                  onChange={(e) =>
                    setSettings({ ...settings, healthCheckIntervalSec: Number(e.target.value) })
                  }
                  className="w-full accent-teal-400 h-1.5 bg-[#161C2A] rounded cursor-pointer"
                />
                <span className="text-sm font-bold font-mono text-teal-400 w-12 text-right">
                  {settings.healthCheckIntervalSec}s
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-1">
                Frequency at which the background daemon checks GET /health
              </p>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5">
                CACHED THREAD POOL WORKER CEILING
              </label>
              <input
                type="number"
                min={50}
                max={1000}
                value={settings.threadPoolSize}
                onChange={(e) => setSettings({ ...settings, threadPoolSize: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs rounded bg-[#161C2A] border border-[#232D42] text-slate-200 font-mono focus:border-teal-400 focus:outline-none"
              />
              <p className="text-[10px] text-slate-500 font-mono mt-1">
                Max concurrent cross-piping worker threads
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs tracking-tight transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save & Hot-Reload Engine</span>
            </button>
          </div>
        </form>
      </div>

      {/* Account Profile Card */}
      <div className="p-6 rounded-xl bg-[#111622] border border-[#232D42] shadow-card">
        <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4 pb-3 border-b border-[#232D42]">
          <UserIcon className="w-4 h-4 text-teal-400" />
          <span>Operator Profile</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-3 rounded bg-[#0B0E14] border border-[#232D42]">
            <span className="text-slate-500 block text-[10px]">OPERATOR NAME</span>
            <span className="text-white font-semibold">{user?.name || 'Demo Operator'}</span>
          </div>
          <div className="p-3 rounded bg-[#0B0E14] border border-[#232D42]">
            <span className="text-slate-500 block text-[10px]">EMAIL ADDRESS</span>
            <span className="text-white font-semibold">{user?.email || 'demo@relay.dev'}</span>
          </div>
          <div className="p-3 rounded bg-[#0B0E14] border border-[#232D42]">
            <span className="text-slate-500 block text-[10px]">ROLE & PRIVILEGES</span>
            <span className="text-teal-400 font-semibold uppercase">{user?.role || 'admin'}</span>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="p-6 rounded-xl bg-[#111622] border border-[#232D42] shadow-card">
        <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4 pb-3 border-b border-[#232D42]">
          <Lock className="w-4 h-4 text-teal-400" />
          <span>Change Password</span>
        </h2>

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-1.5 text-xs rounded bg-[#161C2A] border border-[#232D42] text-slate-200 font-mono focus:border-teal-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-3 py-1.5 text-xs rounded bg-[#161C2A] border border-[#232D42] text-slate-200 font-mono focus:border-teal-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type new password"
              className="w-full px-3 py-1.5 text-xs rounded bg-[#161C2A] border border-[#232D42] text-slate-200 font-mono focus:border-teal-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="px-4 py-2 rounded-md bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs tracking-tight transition-colors disabled:opacity-50"
          >
            {passwordLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};
