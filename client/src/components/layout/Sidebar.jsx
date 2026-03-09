import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCircle, Car, Calendar,
  ClipboardList, Package, FileText, Star, Bell,
  LogOut, Wrench, ChevronRight, Settings,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { ROLES } from '../../utils/constants';
import toast from 'react-hot-toast';

// ─── Nav link definitions per role ───────────────────────
const navLinks = {
  [ROLES.ADMIN]: [
    { to: '/admin/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
    { to: '/admin/staff',        label: 'Staff',        icon: Users },
    { to: '/admin/clients',      label: 'Clients',      icon: UserCircle },
    { to: '/admin/vehicles',     label: 'Vehicles',     icon: Car },
    { to: '/admin/appointments', label: 'Appointments', icon: Calendar },
    { to: '/admin/job-cards',    label: 'Job Cards',    icon: ClipboardList },
    { to: '/admin/inventory',    label: 'Inventory',    icon: Package },
    { to: '/admin/invoices',     label: 'Invoices',     icon: FileText },
    { to: '/admin/reviews',      label: 'Reviews',      icon: Star },
  ],
  [ROLES.SUPERVISOR]: [
    { to: '/supervisor/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
    { to: '/supervisor/staff',        label: 'Staff',        icon: Users },
    { to: '/supervisor/clients',      label: 'Clients',      icon: UserCircle },
    { to: '/supervisor/vehicles',     label: 'Vehicles',     icon: Car },
    { to: '/supervisor/appointments', label: 'Appointments', icon: Calendar },
    { to: '/supervisor/job-cards',    label: 'Job Cards',    icon: ClipboardList },
    { to: '/supervisor/inventory',    label: 'Inventory',    icon: Package },
    { to: '/supervisor/invoices',     label: 'Invoices',     icon: FileText },
    { to: '/supervisor/reviews',      label: 'Reviews',      icon: Star },
  ],
  [ROLES.MECHANIC]: [
    { to: '/mechanic/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/mechanic/my-jobs',   label: 'My Jobs',   icon: ClipboardList },
  ],
  [ROLES.RECEPTIONIST]: [
    { to: '/receptionist/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
    { to: '/receptionist/clients',      label: 'Clients',      icon: UserCircle },
    { to: '/receptionist/appointments', label: 'Appointments', icon: Calendar },
    { to: '/receptionist/job-cards',    label: 'Job Cards',    icon: ClipboardList },
    { to: '/receptionist/invoices',     label: 'Invoices',     icon: FileText },
  ],
  [ROLES.CLIENT]: [
    { to: '/client/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
    { to: '/client/vehicles',     label: 'My Vehicles',  icon: Car },
    { to: '/client/appointments', label: 'Appointments', icon: Calendar },
    { to: '/client/jobs',         label: 'My Jobs',      icon: ClipboardList },
    { to: '/client/invoices',     label: 'My Invoices',  icon: FileText },
    { to: '/client/reviews',      label: 'My Reviews',   icon: Star },
  ],
};

const Sidebar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const links = navLinks[user?.role] || [];

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully.');
    navigate('/login');
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrator',
      supervisor: 'Supervisor',
      mechanic: 'Mechanic',
      receptionist: 'Receptionist',
      client: 'Client',
    };
    return labels[role] || role;
  };

  const getRoleColor = (role) => {
    const colors = {
      admin:        'from-blue-500 to-indigo-500',
      supervisor:   'from-purple-500 to-violet-500',
      mechanic:     'from-emerald-500 to-teal-500',
      receptionist: 'from-amber-500 to-orange-500',
      client:       'from-rose-500 to-pink-500',
    };
    return colors[role] || 'from-blue-500 to-indigo-500';
  };

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 z-40 flex flex-col
      bg-white/5 backdrop-blur-xl border-r border-white/10 shadow-2xl">

      {/* ── Logo ─────────────────────────────────── */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600
            p-2.5 rounded-xl shadow-lg shadow-blue-500/30">
            <Wrench size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-none">AutoFix</h1>
            <p className="text-white/40 text-xs mt-0.5">Garage Management</p>
          </div>
        </div>
      </div>

      {/* ── User Profile ──────────────────────────── */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
          <div className={`bg-gradient-to-br ${getRoleColor(user?.role)}
            w-9 h-9 rounded-xl flex items-center justify-center
            text-white font-bold text-sm shadow-lg flex-shrink-0`}>
            {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="text-white font-semibold text-sm truncate">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-white/40 text-xs truncate">
              {getRoleLabel(user?.role)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Navigation Links ──────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
               transition-all duration-200 group
               ${isActive
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30'
                : 'text-white/60 hover:text-white hover:bg-white/10'
               }`
            }
          >
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

      {/* ── Bottom Actions ────────────────────────── */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
            text-sm font-medium text-white/60 hover:text-white
            hover:bg-red-500/20 transition-all duration-200 group"
        >
          <LogOut size={18} className="text-white/50 group-hover:text-red-400" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;