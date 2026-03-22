import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Search, Eye, CheckCircle, Ban,
  RefreshCw, Trash2, ChevronDown, BadgeCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import SuperAdminLayout from './SuperAdminLayout';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';

const fetchGarages = () => axiosInstance.get('/super-admin/garages').then(r => r.data);

const statusBadge = (status) => {
  const map = {
    active:    { variant: 'success', label: 'Active' },
    pending:   { variant: 'warning', label: 'Pending' },
    suspended: { variant: 'danger',  label: 'Suspended' },
  };
  return map[status] || { variant: 'neutral', label: status };
};

const planBadge = (plan) => {
  const map = {
    free:    'bg-white/10 text-white/50',
    basic:   'bg-blue-500/20 text-blue-300',
    premium: 'bg-amber-500/20 text-amber-300',
  };
  return map[plan] || 'bg-white/10 text-white/50';
};

const SuperAdminGarages = () => {
  const queryClient = useQueryClient();
  const [search, setSearch]           = useState('');
  const [filterStatus, setFilter]     = useState('all');
  const [viewGarage, setViewGarage]   = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type, garage }

  const { data, isLoading, isError, error } = useQuery({ queryKey: ['superAdminGarages'], queryFn: fetchGarages, staleTime: 0 });

  const approveMutation = useMutation({
    mutationFn: (id) => axiosInstance.put(`/super-admin/garages/${id}/approve`).then(r => r.data),
    onSuccess: (_, id) => { toast.success('Garage approved.'); queryClient.invalidateQueries(['superAdminGarages', 'superAdminDashboard']); setConfirmAction(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => axiosInstance.put(`/super-admin/garages/${id}/reject`).then(r => r.data),
    onSuccess: () => { toast.success('Garage rejected and removed.'); queryClient.invalidateQueries(['superAdminGarages', 'superAdminDashboard']); setConfirmAction(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const suspendMutation = useMutation({
    mutationFn: (id) => axiosInstance.put(`/super-admin/garages/${id}/suspend`).then(r => r.data),
    onSuccess: () => { toast.success('Garage suspended.'); queryClient.invalidateQueries(['superAdminGarages', 'superAdminDashboard']); setConfirmAction(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id) => axiosInstance.put(`/super-admin/garages/${id}/reactivate`).then(r => r.data),
    onSuccess: () => { toast.success('Garage reactivated.'); queryClient.invalidateQueries(['superAdminGarages', 'superAdminDashboard']); setConfirmAction(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const verifyMutation = useMutation({
    mutationFn: (id) => axiosInstance.put(`/super-admin/garages/${id}/verify`).then(r => r.data),
    onSuccess: (d) => { toast.success(d.message); queryClient.invalidateQueries(['superAdminGarages']); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const subMutation = useMutation({
    mutationFn: ({ id, plan }) => axiosInstance.put(`/super-admin/garages/${id}/subscription`, { subscription_plan: plan }).then(r => r.data),
    onSuccess: () => { toast.success('Subscription updated.'); queryClient.invalidateQueries(['superAdminGarages']); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const garages  = data?.data || [];
  const filtered = garages.filter((g) => {
    const matchSearch = `${g.name} ${g.city} ${g.email}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || g.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const actionMutation = confirmAction?.type === 'approve'    ? approveMutation
                       : confirmAction?.type === 'reject'     ? rejectMutation
                       : confirmAction?.type === 'suspend'    ? suspendMutation
                       : reactivateMutation;

  const actionColors = {
    approve:    'from-emerald-500 to-teal-500',
    reject:     'from-red-500 to-rose-500',
    suspend:    'from-red-500 to-rose-500',
    reactivate: 'from-emerald-500 to-teal-500',
  };

  return (
    <SuperAdminLayout title="Garage Management" subtitle="View, approve and manage all registered garages.">

      {/* ── Top Bar ──────────────────────────────────────── */}
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
            <option value="all" className="bg-slate-800">All Statuses</option>
            <option value="active"    className="bg-slate-800">Active</option>
            <option value="pending"   className="bg-slate-800">Pending</option>
            <option value="suspended" className="bg-slate-800">Suspended</option>
          </select>
        </div>
      </GlassCard>

      {/* ── Garages List ─────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Spinner size="md" text="Loading garages..." /></div>
      ) : isError ? (
        <GlassCard className="flex flex-col items-center justify-center py-16 gap-2">
          <Building2 size={36} className="text-white/20" />
          <p className="text-white/40 text-sm">Failed to load garages: {error?.message}</p>
        </GlassCard>
      ) : filtered.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-16 gap-2">
          <Building2 size={36} className="text-white/20" />
          <p className="text-white/40 text-sm">No garages found.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((g) => {
            const badge = statusBadge(g.status);
            return (
              <GlassCard key={g.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-500/20
                    flex items-center justify-center flex-shrink-0">
                    <Building2 size={20} className="text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className="text-white font-bold text-sm">{g.name}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-lg capitalize font-medium ${planBadge(g.subscription_plan)}`}>
                          {g.subscription_plan}
                        </span>
                        <Badge label={badge.label} variant={badge.variant} />
                      </div>
                    </div>
                    <p className="text-white/40 text-xs mt-1">{g.city} • {g.email} • {g.phone}</p>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-white/30">
                      <span>Staff: {g.staff_count}</span>
                      <span>Clients: {g.client_count}</span>
                      <span>Jobs: {g.job_count}</span>
                      <span>Revenue: KES {parseFloat(g.total_revenue || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
                    <button onClick={() => setViewGarage(g)}
                      className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all" title="View">
                      <Eye size={15} />
                    </button>
                    {g.status === 'pending' && (
                      <>
                        <button onClick={() => setConfirmAction({ type: 'approve', garage: g })}
                          className="p-2 rounded-xl text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Approve">
                          <CheckCircle size={15} />
                        </button>
                        <button onClick={() => setConfirmAction({ type: 'reject', garage: g })}
                          className="p-2 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Reject">
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                    <button onClick={() => verifyMutation.mutate(g.id)}
                      className={`p-2 rounded-xl transition-all
                        ${g.is_verified
                          ? 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'
                          : 'text-white/40 hover:text-blue-400 hover:bg-blue-500/10'
                        }`}
                      title={g.is_verified ? 'Remove Verification' : 'Verify Garage'}>
                      <BadgeCheck size={15} />
                    </button>
                    {g.status === 'active' && (
                      <button onClick={() => setConfirmAction({ type: 'suspend', garage: g })}
                        className="p-2 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Suspend">
                        <Ban size={15} />
                      </button>
                    )}
                    {g.status === 'suspended' && (
                      <button onClick={() => setConfirmAction({ type: 'reactivate', garage: g })}
                        className="p-2 rounded-xl text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Reactivate">
                        <RefreshCw size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* ── View Garage Modal ─────────────────────────────── */}
      {viewGarage && (
        <Modal isOpen={!!viewGarage} onClose={() => setViewGarage(null)} title="Garage Details" size="md">
          <div className="space-y-3">
            {[
              { label: 'Name',         value: viewGarage.name },
              { label: 'Email',        value: viewGarage.email },
              { label: 'Phone',        value: viewGarage.phone },
              { label: 'City',         value: viewGarage.city || '—' },
              { label: 'Address',      value: viewGarage.address || '—' },
              { label: 'Status',       value: viewGarage.status },
              { label: 'Plan',         value: viewGarage.subscription_plan },
              { label: 'Staff',        value: viewGarage.staff_count },
              { label: 'Clients',      value: viewGarage.client_count },
              { label: 'Jobs',         value: viewGarage.job_count },
              { label: 'Revenue',      value: `KES ${parseFloat(viewGarage.total_revenue || 0).toLocaleString()}` },
              { label: 'Registered',   value: new Date(viewGarage.created_at).toLocaleDateString('en-KE') },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between p-3
                bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/40 text-sm">{label}</p>
                <p className="text-white text-sm font-medium capitalize">{value}</p>
              </div>
            ))}

            {/* Subscription plan changer */}
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <p className="text-white/40 text-sm mb-2">Change Subscription Plan</p>
              <div className="flex gap-2">
                {['free', 'basic', 'premium'].map((plan) => (
                  <button key={plan}
                    onClick={() => subMutation.mutate({ id: viewGarage.id, plan })}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all
                      ${viewGarage.subscription_plan === plan
                        ? 'bg-purple-500/30 text-purple-200 border border-purple-500/40'
                        : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                      }`}>
                    {plan}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Confirm Action Modal ──────────────────────────── */}
      {confirmAction && (
        <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title={`${confirmAction.type.charAt(0).toUpperCase() + confirmAction.type.slice(1)} Garage`} size="sm">
          <div className="text-center space-y-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto
              ${confirmAction.type === 'approve' || confirmAction.type === 'reactivate'
                ? 'bg-emerald-500/20 border border-emerald-500/30'
                : 'bg-red-500/20 border border-red-500/30'
              }`}>
              {confirmAction.type === 'approve' || confirmAction.type === 'reactivate'
                ? <CheckCircle size={24} className="text-emerald-400" />
                : confirmAction.type === 'suspend'
                  ? <Ban size={24} className="text-red-400" />
                  : <Trash2 size={24} className="text-red-400" />
              }
            </div>
            <div>
              <p className="text-white font-medium capitalize">{confirmAction.type} this garage?</p>
              <p className="text-white/50 text-sm mt-1">{confirmAction.garage.name}</p>
              {confirmAction.type === 'reject' && (
                <p className="text-red-400/70 text-xs mt-1">This will permanently delete the garage and its admin account.</p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                Cancel
              </button>
              <button
                onClick={() => actionMutation.mutate(confirmAction.garage.id)}
                disabled={actionMutation.isPending}
                className={`flex-1 bg-gradient-to-r ${actionColors[confirmAction.type]}
                  text-white font-semibold rounded-xl py-2.5 text-sm
                  transition-all disabled:opacity-50 flex items-center justify-center gap-2`}>
                {actionMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing...</>
                  : <span className="capitalize">{confirmAction.type}</span>
                }
              </button>
            </div>
          </div>
        </Modal>
      )}

    </SuperAdminLayout>
  );
};

export default SuperAdminGarages;