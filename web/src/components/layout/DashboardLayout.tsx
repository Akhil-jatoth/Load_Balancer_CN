import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  Activity,
  GitBranch,
  ShieldAlert,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  Radio,
  ExternalLink,
  Menu,
  X,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useWebSocket } from '../../context/WebSocketContext';

export const DashboardLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { connected } = useWebSocket();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
    { to: '/dashboard/backends', label: 'Backends', icon: Server },
    { to: '/dashboard/connections', label: 'Live Connections', icon: Activity },
    { to: '/dashboard/rules', label: 'Routing & Limits', icon: GitBranch },
    { to: '/dashboard/simulator', label: 'Failure Simulator', icon: ShieldAlert },
    { to: '/dashboard/logs', label: 'Logs & Telemetry', icon: FileText },
    { to: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  const getBreadcrumb = () => {
    const current = navItems.find((item) =>
      item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to)
    );
    return current ? current.label : 'Dashboard';
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-[#0B0E14] text-slate-100 dark:bg-[#0B0E14] light:bg-slate-50 light:text-slate-900">
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 flex flex-col border-r border-[#232D42] bg-[#0E121A] transition-all duration-200 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-[#232D42]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded bg-teal-500/10 border border-teal-500/30 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 text-teal-400" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
                  RELAY
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-400 font-mono border border-teal-500/20">
                    CORE
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">TCP / HTTP Proxy</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-7 h-7 rounded border border-[#232D42] text-slate-400 hover:text-white items-center justify-center hover:bg-[#161C2A] transition-colors"
            aria-label="Toggle sidebar collapse"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Live Engine Indicator */}
        <div className="px-4 py-3 border-b border-[#232D42]/60 bg-[#0B0E14]/40">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                {connected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    connected ? 'bg-teal-400' : 'bg-rose-500'
                  }`}
                />
              </span>
              {!collapsed && (
                <span className="text-[11px] font-mono text-slate-400 tracking-tight">
                  {connected ? 'CORE ONLINE (8080)' : 'CONNECTING...'}
                </span>
              )}
            </div>
            {!collapsed && (
              <span className="text-[10px] text-slate-400 font-mono">JAVA RAW</span>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#161C2A] border border-transparent'
                  } ${collapsed ? 'justify-center px-0' : ''}`
                }
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t border-[#232D42] bg-[#0B0E14]/60">
          {!collapsed ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded bg-teal-500/20 text-teal-300 font-mono text-xs flex items-center justify-center font-bold shrink-0">
                  {user?.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">{user?.name || 'Operator'}</p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">{user?.email || 'admin@relay.dev'}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-rose-400 p-1.5 rounded transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-rose-400 p-2 rounded transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 border-b border-[#232D42] bg-[#0E121A]/80 backdrop-blur px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-slate-400 hover:text-white"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">relay</span>
              <span className="text-slate-400">/</span>
              <span className="text-teal-400 font-medium">{getBreadcrumb().toLowerCase()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="http://127.0.0.1:8080/api/users"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono text-slate-400 hover:text-teal-400 rounded border border-[#232D42] hover:border-teal-500/40 bg-[#111622] transition-colors"
            >
              <span>Test :8080/api</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded border border-[#232D42] bg-[#111622] text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
              aria-label="Toggle visual theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Routed Page Container */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#0B0E14]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
