import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, LogOut, Shield, Crown,
  ChevronRight, Menu, X,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const navLinks = [
  { to: '/super-admin/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/super-admin/garages',       label: 'Garages',       icon: Building2 },
  { to: '/super-admin/subscriptions',  label: 'Subscriptions', icon: Crown },
];

const SuperAdminLayout = ({ children, title, subtitle }) => {
  const { user, logout } = useAuthStore();
  const navigate          = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully.');
    navigate('/super-admin/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-900">

      {/* ── Mobile Overlay ──────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className={`fixed top-0 left-0 h-screen w-64 z-40 flex flex-col
        bg-white/5 backdrop-blur-xl border-r border-white/10 shadow-2xl
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>

        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-500 to-violet-600
                p-2.5 rounded-xl shadow-lg shadow-purple-500/30">
                <Shield size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg leading-none">AutoFix</h1>
                <p className="text-purple-300/70 text-xs mt-0.5">Super Admin</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* User Profile */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500
              flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-semibold text-sm truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-purple-300/60 text-xs flex items-center gap-1">
                <Shield size={10} /> Platform Owner
              </p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                 transition-all duration-200 group
                 ${isActive
                  ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/30'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
                 }`
              }>
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-white' : 'text-white/50 group-hover:text-white'} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight size={14} className="text-white/70" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-white/10">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
              text-sm font-medium text-white/60 hover:text-white
              hover:bg-red-500/20 transition-all group">
            <LogOut size={18} className="text-white/50 group-hover:text-red-400" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────── */}
      <div className="lg:ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6
          bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all">
              <Menu size={20} />
            </button>
            <div>
              <p className="text-white/50 text-xs">Platform Control</p>
              <h2 className="text-white font-semibold text-sm leading-tight">
                {user?.first_name} {user?.last_name}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 bg-purple-500/20 border border-purple-500/30
              text-purple-300 text-xs font-semibold px-3 py-1.5 rounded-xl">
              <Shield size={12} /> Super Admin
            </span>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500
              flex items-center justify-center text-white text-xs font-bold ml-1">
              {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6">
          {title && (
            <div className="mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-white">{title}</h1>
              {subtitle && <p className="text-white/50 text-xs sm:text-sm mt-1">{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;