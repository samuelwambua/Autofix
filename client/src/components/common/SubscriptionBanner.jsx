import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Clock, Crown, X, ChevronRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import useAuthStore from '../../store/authStore';

const fetchSubscription = () => axiosInstance.get('/subscription/my').then(r => r.data);

const SubscriptionBanner = () => {
  const { user } = useAuthStore();
  const navigate  = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  // Only show for admin role
  if (user?.role !== 'admin' || dismissed) return null;

  const { data } = useQuery({
    queryKey: ['mySubscription'],
    queryFn: fetchSubscription,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  if (!data?.data) return null;

  const sub = data.data;

  // Don't show banner if premium and active
  if (sub.plan === 'premium' && sub.sub_active) return null;

  // Trial ending soon (≤ 7 days)
  if (sub.in_trial && sub.days_left <= 7) {
    return (
      <div className="mx-4 sm:mx-6 mt-4 bg-amber-500/20 border border-amber-500/40
        rounded-2xl p-4 flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/30 flex items-center
            justify-center flex-shrink-0">
            <Clock size={18} className="text-amber-300" />
          </div>
          <div>
            <p className="text-amber-200 font-semibold text-sm">
              Free Trial Ending Soon — {sub.days_left} day{sub.days_left !== 1 ? 's' : ''} left
            </p>
            <p className="text-amber-300/70 text-xs mt-0.5">
              Subscribe now to keep your garage running without interruption.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate('/admin/subscription')}
            className="flex items-center gap-1.5 bg-amber-500/30 hover:bg-amber-500/40
              text-amber-200 text-xs font-semibold rounded-xl px-3 py-2
              border border-amber-500/40 transition-all whitespace-nowrap"
          >
            Subscribe <ChevronRight size={12} />
          </button>
          <button onClick={() => setDismissed(true)}
            className="p-1.5 text-amber-300/50 hover:text-amber-300 transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  // Trial active and plenty of time — show subtle badge only
  if (sub.in_trial && sub.days_left > 7) {
    return (
      <div className="mx-4 sm:mx-6 mt-4 bg-blue-500/10 border border-blue-500/20
        rounded-2xl p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle size={15} className="text-blue-400 flex-shrink-0" />
          <p className="text-blue-300/80 text-xs">
            Free Trial Active — <span className="font-semibold">{sub.days_left} days remaining</span>
          </p>
        </div>
        <button onClick={() => setDismissed(true)}
          className="p-1 text-blue-300/30 hover:text-blue-300/70 transition-colors">
          <X size={12} />
        </button>
      </div>
    );
  }

  // Basic plan — show upgrade nudge
  if (sub.plan === 'basic' && sub.sub_active) {
    return (
      <div className="mx-4 sm:mx-6 mt-4 bg-purple-500/10 border border-purple-500/20
        rounded-2xl p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Crown size={15} className="text-purple-400 flex-shrink-0" />
          <p className="text-purple-300/80 text-xs">
            Basic Plan — <span className="font-semibold">Upgrade to Premium</span> for unlimited access
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/admin/subscription')}
            className="text-purple-300 text-xs hover:text-purple-200 transition-colors font-semibold whitespace-nowrap">
            Upgrade →
          </button>
          <button onClick={() => setDismissed(true)}
            className="p-1 text-purple-300/30 hover:text-purple-300/70 transition-colors">
            <X size={12} />
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default SubscriptionBanner;