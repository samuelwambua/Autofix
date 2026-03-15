import { useState } from 'react';
import { Bell, Search, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const Header = ({ onMenuClick }) => {
  const { user } = useAuthStore();
  const navigate  = useNavigate();
  const [showSearch, setShowSearch] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getNotificationPath = () => {
    const paths = {
      admin:        '/admin/dashboard',
      supervisor:   '/supervisor/dashboard',
      mechanic:     '/mechanic/dashboard',
      receptionist: '/receptionist/dashboard',
      client:       '/client/dashboard',
    };
    return paths[user?.role] || '/';
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-6
      bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-20">

      {/* ── Left ─────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-white/50 hover:text-white
            hover:bg-white/10 transition-all duration-200"
        >
          <Menu size={20} />
        </button>

        <div className="hidden sm:block">
          <p className="text-white/50 text-xs">{getGreeting()},</p>
          <h2 className="text-white font-semibold text-sm leading-tight">
            {user?.first_name} {user?.last_name}
          </h2>
        </div>
        {/* Short greeting on very small screens */}
        <div className="sm:hidden">
          <h2 className="text-white font-semibold text-sm">
            Hi, {user?.first_name} 👋
          </h2>
        </div>
      </div>

      {/* ── Right ────────────────────────────────────── */}
      <div className="flex items-center gap-1 sm:gap-2">

        {/* Search — hidden on xs, visible sm+ */}
        <div className="hidden sm:flex items-center gap-2">
          {showSearch && (
            <input
              autoFocus
              type="text"
              placeholder="Search..."
              onBlur={() => setShowSearch(false)}
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-1.5
                text-white placeholder-white/40 text-sm w-36 sm:w-48
                focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          )}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 rounded-xl text-white/50 hover:text-white
              hover:bg-white/10 transition-all duration-200"
          >
            <Search size={18} />
          </button>
        </div>

        {/* Notifications */}
        <button
          onClick={() => navigate(getNotificationPath())}
          className="relative p-2 rounded-xl text-white/50 hover:text-white
            hover:bg-white/10 transition-all duration-200"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2
            bg-blue-400 rounded-full border border-slate-900" />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500
          flex items-center justify-center text-white text-xs font-bold
          shadow-lg shadow-blue-500/30 cursor-pointer ml-1">
          {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
        </div>
      </div>
    </header>
  );
};

export default Header;