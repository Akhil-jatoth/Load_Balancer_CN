import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Layers, Lock, Mail, User as UserIcon, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-xl font-bold tracking-tight text-white">Create operator account</h1>
          <p className="text-xs text-slate-400 mt-1">Deploy and monitor custom session proxy pools</p>
        </div>

        <div className="p-7 rounded-xl border border-[#232D42] bg-[#111622] shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="name">
                Operator Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-md bg-[#161C2A] border border-[#232D42] focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400 text-slate-100 placeholder-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="email">
                Work Email Address
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
                  placeholder="alex@relay.dev"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-md bg-[#161C2A] border border-[#232D42] focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400 text-slate-100 placeholder-slate-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="password">
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
                  placeholder="At least 8 characters"
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

              {/* Password strength meter */}
              {password && (
                <div className="mt-2">
                  <div className="grid grid-cols-4 gap-1 h-1">
                    <div className={`rounded-full ${strength >= 1 ? 'bg-rose-400' : 'bg-slate-700'}`} />
                    <div className={`rounded-full ${strength >= 2 ? 'bg-amber-400' : 'bg-slate-700'}`} />
                    <div className={`rounded-full ${strength >= 3 ? 'bg-teal-400' : 'bg-slate-700'}`} />
                    <div className={`rounded-full ${strength >= 4 ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    {strength <= 1 && 'Weak password'}
                    {strength === 2 && 'Fair password'}
                    {strength === 3 && 'Good password'}
                    {strength === 4 && 'Strong password'}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-md bg-[#161C2A] border border-[#232D42] focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400 text-slate-100 placeholder-slate-500 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs tracking-tight transition-colors disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-teal-400 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
