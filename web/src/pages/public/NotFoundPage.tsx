import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Layers, ShieldAlert } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0E14] text-slate-100 p-6 text-center">
      <div className="max-w-md w-full">
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6 text-rose-400" />
        </div>
        <span className="text-4xl font-mono font-extrabold text-white tracking-tight">404</span>
        <h1 className="text-lg font-bold text-slate-200 mt-2">Route Unreachable</h1>
        <p className="text-xs text-slate-400 mt-1 mb-6">
          The requested path does not map to any active dashboard route or control-plane endpoint.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs tracking-tight transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Overview</span>
        </Link>
      </div>
    </div>
  );
};
