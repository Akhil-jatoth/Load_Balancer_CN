import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Layers, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('demo@relay.dev');
    setPassword('Demo@1234');
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0E14] text-slate-100 p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="w-8 h-8 rounded bg-teal-500/10 border border-teal-500/30 flex items-center justify-center group-hover:border-teal-400 transition-colors">
              <Layers className="w-4 h-4 text-teal-400" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white">RELAY</span>
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-white mb-1.5">Sign in to control plane</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Manage your raw socket proxy routing, load balancer pools, and live telemetry.
          </p>
        </div>

        <div className="p-7 rounded-xl border border-[#232D42] bg-[#111622] shadow-card">
          {/* Demo Fill Helper Card */}
          <div className="mb-6 p-3 rounded-lg border border-[#232D42] bg-[#0B0E14] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-200">Demo Credentials Available</p>
                <p className="text-[11px] font-mono text-slate-400">demo@relay.dev • Demo@1234</p>
              </div>
            </div>
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="text-xs px-2.5 py-1 rounded bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/20 transition-colors font-mono"
            >
              Auto-fill
            </button>
          </div>

          <form onSubmit={handleSubmit} className={`space-y-4 ${shake ? 'animate-shake' : ''}`}>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs"
              >
                {error}
              </motion.div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="email">
                Operator Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@relay.dev"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-md bg-[#161C2A] border border-[#232D42] focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400 text-slate-100 placeholder-slate-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2 text-xs rounded-md bg-[#161C2A] border border-[#232D42] focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400 text-slate-100 placeholder-slate-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs tracking-tight transition-colors disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign in to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Need an account?{' '}
            <Link to="/register" className="text-teal-400 hover:underline font-medium">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
