import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Crown, Shield, Clock, AlertTriangle, CheckCircle, Search, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import SuperAdminLayout from './SuperAdminLayout';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';

const fetchOverview = () => axiosInstance.get('/subscription/overview').then(r => r.data);

const SuperAdminSubscriptions = () => {
  const queryClient = useQueryClient();
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilter]   = useState('all');
  const [activateModal, setActivateModal] = useState(null);
  const [selectedPlan, setSelectedPlan]   = useState('basic');
  const [months, setMonths]               = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptionsOverview'],
    queryFn: fetchOverview,
    refetchInterval: 30000,
  });

  const activateMutation = useMutation({
    mutationFn: ({ garageId, plan, months }) =>
      axiosInstance.post(`/subscription/${garageId}/activate`, { plan, months }).then(r => r.data),
    onSuccess: (d) => {
      toast.success(d.message);
      queryClient.invalidateQueries(['subscriptionsOverview']);
      setActivateModal(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to activate.'),
  });

  const garages  = data?.data || [];
  const summary  = data?.summary || {};

  const statusBadge = (status) => {
    const map = {
      trial:   { variant: 'info',    label: 'Trial' },
      active:  { variant: 'success', label: 'Active' },
      expired: { variant: 'danger',  label: 'Expired' },
      locked:  { variant: 'danger',  label: 'Locked' },
    };
    return map[status] || { variant: 'neutral', label: status };
  };

  const planIcon = (plan) => {
    if (plan === 'premium') return <Crown size={14} className="text-amber-400" />;
    if (plan === 'basic')   return <Shield size={14} className="text-blue-400" />;
    return <Clock size={14} className="text-white/40" />;
  };

  const filtered = garages.filter(g => {
    const matchSearch = `${g.name} ${g.city} ${g.email}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || g.subscription_status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <SuperAdminLayout title="Subscriptions" subtitle="Manage garage subscription plans and billing.">

      {/* ── Summary Cards ───────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'On Trial',  value: summary.trial   || 0, color: 'bg-blue-500/20 text-blue-300',   icon: Clock },
          { label: 'Active',    value: summary.active  || 0, color: 'bg-emerald-500/20 text-emerald-300', icon: CheckCircle },
          { label: 'Expired',   value: summary.expired || 0, color: 'bg-red-500/20 text-red-300',     icon: AlertTriangle },
          { label: 'Locked',    value: summary.locked  || 0, color: 'bg-gray-500/20 text-gray-400',   icon: AlertTriangle },
        ].map(({ label, value, color, icon: Icon }) => (
          <GlassCard key={label} className="p-4">
            <div className={`w-9 h-9 rounded-xl ${color.split(' ')[0]} flex items-center
              justify-center mb-3`}>
              <Icon size={18} className={color.split(' ')[1]} />
            </div>
            <p className="text-white font-bold text-2xl">{value}</p>
            <p className="text-white/40 text-xs mt-0.5">{label}</p>
          </GlassCard>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────── */}
      <GlassCard className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input type="text" placeholder="Search garages..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-4 py-2
                text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilter(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl px-3 py-2
              text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50">
            <option value="all"    className="bg-slate-800">All</option>
            <option value="trial"  className="bg-slate-800">On Trial</option>
            <option value="active" className="bg-slate-800">Active</option>
            <option value="expired" className="bg-slate-800">Expired</option>
            <option value="locked" className="bg-slate-800">Locked</option>
          </select>
        </div>
      </GlassCard>

      {/* ── Garages List ─────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="md" text="Loading subscriptions..." />
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard className="flex items-center justify-center py-16">
          <p className="text-white/30 text-sm">No garages found.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((g) => {
            const badge = statusBadge(g.subscription_status);
            return (
              <GlassCard key={g.id} className="p-4">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-white font-bold text-sm">{g.name}</p>
                      <Badge label={badge.label} variant={badge.variant} />
                      <div className="flex items-center gap-1">
                        {planIcon(g.subscription_plan)}
                        <span className="text-white/50 text-xs capitalize">{g.subscription_plan}</span>
                      </div>
                    </div>
                    <p className="text-white/40 text-xs">{g.city} • {g.email}</p>

                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-white/40">
                      {g.subscription_status === 'trial' && g.trial_days_left > 0 && (
                        <span className="text-blue-400 font-medium">
                          ⏱ {g.trial_days_left} trial days left
                        </span>
                      )}
                      {g.subscription_status === 'active' && g.sub_days_left > 0 && (
                        <span className="text-emerald-400 font-medium">
                          ✓ {g.sub_days_left} days remaining
                        </span>
                      )}
                      {g.subscription_status === 'expired' && (
                        <span className="text-red-400 font-medium">⚠ Subscription expired</span>
                      )}
                      {g.trial_ends_at && (
                        <span>Trial: {new Date(g.trial_ends_at).toLocaleDateString('en-KE')}</span>
                      )}
                      {g.subscription_ends_at && (
                        <span>Sub ends: {new Date(g.subscription_ends_at).toLocaleDateString('en-KE')}</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => { setActivateModal(g); setSelectedPlan('basic'); setMonths(1); }}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-violet-500
                      hover:from-purple-600 hover:to-violet-600 text-white font-semibold
                      rounded-xl px-4 py-2 text-xs shadow-lg transition-all whitespace-nowrap flex-shrink-0"
                  >
                    <Zap size={13} /> Activate Plan
                  </button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* ── Activate Plan Modal ───────────────────────────── */}
      {activateModal && (
        <Modal isOpen={!!activateModal} onClose={() => setActivateModal(null)}
          title="Activate Subscription" size="sm">
          <div className="space-y-4">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <p className="text-white font-semibold text-sm">{activateModal.name}</p>
              <p className="text-white/40 text-xs">{activateModal.city} • {activateModal.email}</p>
            </div>

            {/* Plan Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-white/70 text-sm font-medium">Subscription Plan</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'basic',   label: 'Basic',   price: 'KES 3,000/mo', color: 'border-blue-500/50 bg-blue-500/20',   active: 'ring-2 ring-blue-500' },
                  { key: 'premium', label: 'Premium', price: 'KES 6,500/mo', color: 'border-amber-500/50 bg-amber-500/20', active: 'ring-2 ring-amber-500' },
                ].map(p => (
                  <button key={p.key} onClick={() => setSelectedPlan(p.key)}
                    className={`p-3 rounded-xl border text-left transition-all
                      ${selectedPlan === p.key ? `${p.color} ${p.active}` : 'bg-white/5 border-white/20 hover:bg-white/10'}`}>
                    <p className="text-white text-sm font-semibold">{p.label}</p>
                    <p className="text-white/50 text-xs">{p.price}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="flex flex-col gap-1.5">
              <label className="text-white/70 text-sm font-medium">Duration (months)</label>
              <select value={months} onChange={(e) => setMonths(parseInt(e.target.value))}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5
                  text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                {[1, 2, 3, 6, 12].map(m => (
                  <option key={m} value={m} className="bg-slate-800">
                    {m} month{m > 1 ? 's' : ''} — KES {(selectedPlan === 'premium' ? 6500 : 3000) * m}
                  </option>
                ))}
              </select>
            </div>

            {/* Summary */}
            <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <p className="text-white/60 text-xs mb-1">Activation Summary</p>
              <p className="text-white text-sm font-semibold capitalize">
                {selectedPlan} Plan — {months} month{months > 1 ? 's' : ''}
              </p>
              <p className="text-purple-300 text-xs mt-0.5">
                Total: KES {((selectedPlan === 'premium' ? 6500 : 3000) * months).toLocaleString()}
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setActivateModal(null)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                  rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                Cancel
              </button>
              <button
                onClick={() => activateMutation.mutate({ garageId: activateModal.id, plan: selectedPlan, months })}
                disabled={activateMutation.isPending}
                className="flex-1 bg-gradient-to-r from-purple-500 to-violet-500
                  text-white font-semibold rounded-xl py-2.5 text-sm
                  transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {activateMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Activating...</>
                  : <><Zap size={14} /> Activate Plan</>
                }
              </button>
            </div>
          </div>
        </Modal>
      )}

    </SuperAdminLayout>
  );
};

export default SuperAdminSubscriptions;