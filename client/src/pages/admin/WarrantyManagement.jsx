import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus, Eye, CheckCircle, X, AlertTriangle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';
import StatCard from '../../components/common/StatCard';

const fetchWarranties = () => axiosInstance.get('/warranties').then(r => r.data);
const fetchClaims     = () => axiosInstance.get('/warranties/claims').then(r => r.data);
const fetchJobCards   = () => axiosInstance.get('/job-cards').then(r => r.data);

const STATUS_BADGE = {
  active:  { variant: 'success', label: 'Active' },
  expired: { variant: 'neutral', label: 'Expired' },
  claimed: { variant: 'info',    label: 'Claimed' },
};

const CLAIM_BADGE = {
  pending:  { variant: 'warning', label: 'Pending' },
  approved: { variant: 'info',    label: 'Approved' },
  rejected: { variant: 'danger',  label: 'Rejected' },
  resolved: { variant: 'success', label: 'Resolved' },
};

const inputClass = 'w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50';

const WarrantyManagement = () => {
  const queryClient = useQueryClient();
  const [tab, setTab]                     = useState('warranties');
  const [showCreate, setShowCreate]       = useState(false);
  const [viewClaim, setViewClaim]         = useState(null);
  const [resolution, setResolution]       = useState('');
  const [form, setForm]                   = useState({
    job_card_id: '', warranty_period_days: 90,
    warranty_period_km: '', mileage_at_service: '', description: '',
  });

  const { data: warData, isLoading: warLoading } = useQuery({ queryKey: ['garageWarranties'], queryFn: fetchWarranties });
  const { data: claimData, isLoading: claimLoading } = useQuery({ queryKey: ['warrantyClaims'], queryFn: fetchClaims });
  const { data: jobData } = useQuery({ queryKey: ['jobCards'], queryFn: fetchJobCards });

  const createMutation = useMutation({
    mutationFn: (data) => axiosInstance.post('/warranties', data).then(r => r.data),
    onSuccess: (d) => {
      toast.success(d.message);
      queryClient.invalidateQueries(['garageWarranties']);
      setShowCreate(false);
      setForm({ job_card_id: '', warranty_period_days: 90, warranty_period_km: '', mileage_at_service: '', description: '' });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const updateClaimMutation = useMutation({
    mutationFn: ({ id, status, notes }) =>
      axiosInstance.put(`/warranties/claims/${id}`, { status, resolution_notes: notes }).then(r => r.data),
    onSuccess: (d) => {
      toast.success(d.message);
      queryClient.invalidateQueries(['warrantyClaims', 'garageWarranties']);
      setViewClaim(null); setResolution('');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const warranties = warData?.data || [];
  const claims     = claimData?.data || [];
  const completedJobs = (jobData?.data || []).filter(j => j.status === 'completed');
  const pendingClaims = claims.filter(c => c.status === 'pending').length;

  return (
    <PageWrapper title="Warranty Management" subtitle="Issue and manage service guarantees for clients.">

      {/* ── Stats ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Warranties" value={warranties.length}                              icon={Shield}       color="blue" />
        <StatCard title="Active"           value={warranties.filter(w=>w.status==='active').length} icon={CheckCircle} color="emerald" />
        <StatCard title="Pending Claims"   value={pendingClaims}                                  icon={AlertTriangle} color="amber" />
        <StatCard title="Total Claims"     value={claims.length}                                  icon={Clock}        color="purple" />
      </div>

      {/* ── Tabs + Create ──────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-2">
          {[
            { key: 'warranties', label: 'Warranties' },
            { key: 'claims',     label: `Claims ${pendingClaims > 0 ? `(${pendingClaims})` : ''}` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all
                ${tab === t.key
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                  : 'bg-white/10 text-white/60 hover:bg-white/20 border border-white/20'
                }`}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'warranties' && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500
              text-white font-semibold rounded-xl px-4 py-2 text-sm shadow-lg transition-all">
            <Plus size={15} /> Issue Warranty
          </button>
        )}
      </div>

      {/* ── Warranties Tab ────────────────────────────── */}
      {tab === 'warranties' && (
        warLoading ? <div className="flex justify-center py-12"><Spinner size="md" /></div> :
        warranties.length === 0 ? (
          <GlassCard className="flex flex-col items-center justify-center py-16 gap-3">
            <Shield size={36} className="text-white/20" />
            <p className="text-white/40 text-sm">No warranties issued yet.</p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {warranties.map((w) => {
              const days = parseInt(w.days_remaining);
              return (
                <GlassCard key={w.id} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                      ${w.status === 'active' ? 'bg-emerald-500/20' : 'bg-white/10'}`}>
                      <Shield size={18} className={w.status === 'active' ? 'text-emerald-400' : 'text-white/30'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                        <p className="text-white font-bold text-sm">{w.job_description}</p>
                        <Badge label={STATUS_BADGE[w.status]?.label} variant={STATUS_BADGE[w.status]?.variant} />
                      </div>
                      <p className="text-white/50 text-xs">{w.client_name} • {w.client_phone}</p>
                      <p className="text-white/30 text-xs">{w.vehicle_name} • {w.plate_number}</p>
                      <div className="flex flex-wrap gap-3 mt-1.5 text-xs">
                        <span className="text-white/40">{w.warranty_period_days} day warranty</span>
                        {w.status === 'active' && (
                          <span className={days <= 7 ? 'text-amber-400 font-medium' : 'text-white/40'}>
                            {days <= 0 ? 'Expires today' : `${days} days left`}
                          </span>
                        )}
                        {parseInt(w.claim_count) > 0 && (
                          <span className="text-blue-400">{w.claim_count} claim{w.claim_count > 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )
      )}

      {/* ── Claims Tab ────────────────────────────────── */}
      {tab === 'claims' && (
        claimLoading ? <div className="flex justify-center py-12"><Spinner size="md" /></div> :
        claims.length === 0 ? (
          <GlassCard className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertTriangle size={36} className="text-white/20" />
            <p className="text-white/40 text-sm">No warranty claims yet.</p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {claims.map((c) => (
              <GlassCard key={c.id} className={`p-4 ${c.status === 'pending' ? 'border border-amber-500/30' : ''}`}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={18} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                      <p className="text-white font-bold text-sm">{c.client_name}</p>
                      <Badge label={CLAIM_BADGE[c.status]?.label} variant={CLAIM_BADGE[c.status]?.variant} />
                    </div>
                    <p className="text-white/60 text-xs truncate">{c.description}</p>
                    <p className="text-white/30 text-xs">{c.vehicle_name} • {c.plate_number}</p>
                    <p className="text-white/25 text-xs">{new Date(c.created_at).toLocaleDateString('en-KE')}</p>
                  </div>
                  {c.status === 'pending' && (
                    <button onClick={() => { setViewClaim(c); setResolution(''); }}
                      className="flex items-center gap-1.5 bg-blue-500/20 hover:bg-blue-500/30
                        text-blue-300 text-xs font-semibold rounded-xl px-3 py-2
                        border border-blue-500/30 transition-all flex-shrink-0">
                      <Eye size={13} /> Review
                    </button>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        )
      )}

      {/* ── Create Warranty Modal ─────────────────────── */}
      {showCreate && (
        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Issue Warranty" size="sm">
          <div className="space-y-3">
            <div>
              <label className="text-white/60 text-xs font-medium mb-1 block">Completed Job Card *</label>
              <select value={form.job_card_id}
                onChange={(e) => setForm({ ...form, job_card_id: e.target.value })}
                className={inputClass}>
                <option value="" className="bg-slate-800">Select job card</option>
                {completedJobs.map(j => (
                  <option key={j.id} value={j.id} className="bg-slate-800">
                    {j.description} — {j.vehicle_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/60 text-xs font-medium mb-1 block">Warranty (days) *</label>
                <input type="number" value={form.warranty_period_days}
                  onChange={(e) => setForm({ ...form, warranty_period_days: e.target.value })}
                  className={inputClass} />
              </div>
              <div>
                <label className="text-white/60 text-xs font-medium mb-1 block">Warranty (km)</label>
                <input type="number" placeholder="e.g. 5000"
                  value={form.warranty_period_km}
                  onChange={(e) => setForm({ ...form, warranty_period_km: e.target.value })}
                  className={inputClass} />
              </div>
            </div>
            <div>
              <label className="text-white/60 text-xs font-medium mb-1 block">Description</label>
              <textarea rows={2} placeholder="What does this warranty cover?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={`${inputClass} resize-none`} />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                  rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                Cancel
              </button>
              <button onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.job_card_id}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white
                  font-semibold rounded-xl py-2.5 text-sm transition-all disabled:opacity-50
                  flex items-center justify-center gap-2">
                {createMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Issuing...</>
                  : <><Shield size={14} /> Issue Warranty</>
                }
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Review Claim Modal ────────────────────────── */}
      {viewClaim && (
        <Modal isOpen={!!viewClaim} onClose={() => setViewClaim(null)} title="Review Warranty Claim" size="sm">
          <div className="space-y-4">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <p className="text-white font-semibold text-sm">{viewClaim.client_name}</p>
              <p className="text-white/40 text-xs">{viewClaim.vehicle_name} • {viewClaim.plate_number}</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <p className="text-amber-300/70 text-xs mb-1">Client's complaint</p>
              <p className="text-white/80 text-sm">{viewClaim.description}</p>
            </div>
            <div>
              <label className="text-white/60 text-xs font-medium mb-1 block">Resolution Notes</label>
              <textarea rows={2} placeholder="Explain what action will be taken..."
                value={resolution} onChange={(e) => setResolution(e.target.value)}
                className={`${inputClass} resize-none`} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => updateClaimMutation.mutate({ id: viewClaim.id, status: 'approved', notes: resolution })}
                className="flex flex-col items-center gap-1 p-2.5 bg-blue-500/20 hover:bg-blue-500/30
                  text-blue-300 text-xs font-semibold rounded-xl border border-blue-500/30 transition-all">
                <CheckCircle size={14} /> Approve
              </button>
              <button onClick={() => updateClaimMutation.mutate({ id: viewClaim.id, status: 'resolved', notes: resolution })}
                className="flex flex-col items-center gap-1 p-2.5 bg-emerald-500/20 hover:bg-emerald-500/30
                  text-emerald-300 text-xs font-semibold rounded-xl border border-emerald-500/30 transition-all">
                <Shield size={14} /> Resolve
              </button>
              <button onClick={() => updateClaimMutation.mutate({ id: viewClaim.id, status: 'rejected', notes: resolution })}
                className="flex flex-col items-center gap-1 p-2.5 bg-red-500/20 hover:bg-red-500/30
                  text-red-400 text-xs font-semibold rounded-xl border border-red-500/30 transition-all">
                <X size={14} /> Reject
              </button>
            </div>
          </div>
        </Modal>
      )}
    </PageWrapper>
  );
};

export default WarrantyManagement;