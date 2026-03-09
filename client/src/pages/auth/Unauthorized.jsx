import { useNavigate } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import useAuthStore from '../../store/authStore';

const Unauthorized = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const goBack = () => {
    const paths = {
      admin:        '/admin/dashboard',
      supervisor:   '/supervisor/dashboard',
      mechanic:     '/mechanic/dashboard',
      receptionist: '/receptionist/dashboard',
      client:       '/client/dashboard',
    };
    navigate(paths[user?.role] || '/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900
      flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20
          bg-red-500/20 border border-red-500/30 rounded-2xl mb-6">
          <ShieldOff size={36} className="text-red-400" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-white/50 text-sm mb-8">
          You don't have permission to view this page.
        </p>
        <button
          onClick={goBack}
          className="bg-gradient-to-r from-blue-500 to-indigo-500
            hover:from-blue-600 hover:to-indigo-600
            text-white font-semibold rounded-xl px-8 py-3 text-sm
            shadow-lg shadow-blue-500/30 transition-all duration-200"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;