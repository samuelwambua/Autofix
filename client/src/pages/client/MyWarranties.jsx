import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, CheckCircle, X, AlertTriangle, Clock, ChevronRight, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';

const fetchWarranties = () => axiosInstance.get('/warranties/my').then(r => r.data);

const STATUS_BADGE = {
  active:  { variant: 'success', label: 'Active' },
  expired: { variant: 'neutral', label: 'Expired' },
  claimed: { variant: 'info',    label: 'Claimed' },
};

const MyWarranties = () => {
  const queryClient = useQueryClient();
  const [claimModal, setClaimModal]   = useState(null);
  const [claimDesc, setClaimDesc]     = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['myWarranties'], queryFn: fetchWarranties });

  const claimMutation = useMutation({
    mutationFn: (data) => axiosInstance.post('/warranties/claims', data).then(r => r.data),
    onSuccess: (d) => {
      toast.success(d.message);
      queryClient.invalidateQueries(['myWarranties']);
      setClaimModal(null); setClaimDesc('');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const warranties = data?.data || [];
  const active  = warranties.filter(w => w.status === 'active');
  const expired = warranties.filter(w => w.status !== 'active');

  return (
    <PageWrapper title="Warranties" subtitle="Active service guarantees on your repairs.">

      {/* ── Stats ─────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Active',  value: active.length,             color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Expired', value: expired.length,            color: 'text-white/40',    bg: 'bg-white/5' },
          { label: 'Total',   value: warranties.length,         color: 'text-blue-400',    bg: 'bg-blue-500/10' },
        ].map(({ label, value, color, bg }) => (
          <GlassCard key={label} className={`p-4 ${bg}`}>
            <p className={`font-bold text-2xl ${color}`}>{value}</p>
            <p className="text-white/40 text-xs mt-0.5">{label}</p>
          </GlassCard>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="md" text="Loading warranties..." />
        </div>
      ) : warranties.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-16 gap-3">
          <Shield size={36} className="text-white/20" />
          <p className="text-white/40 text-sm">No warranties yet.</p>
          <p className="text-white/25 text-xs text-center">
            Warranties are issued by your garage after service completion.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {warranties.map((w) => {
            const days    = parseInt(w.days_remaining);
            const expiring = w.status === 'active' && days <= 14 && days >= 0;
            return (
              <GlassCard key={w.id}
                className={`p-4 ${expiring ? 'border border-amber-500/30' : ''}`}>
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
                    <p className="text-white/50 text-xs">{w.vehicle_name} • {w.plate_number}</p>
                    <p className="text-white/30 text-xs">{w.garage_name}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs">
                      <span className="text-white/40">
                        {w.warranty_period_days} day warranty
                      </span>
                      <span className={`font-medium
                        ${days <= 0 ? 'text-red-400' :
                          days <= 14 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {w.status === 'active'
                          ? days <= 0 ? 'Expired today'
                            : `${days} days remaining`
                          : `Expired ${new Date(w.expires_at).toLocaleDateString('en-KE')}`
                        }
                      </span>
                    </div>
                    {w.description && (
                      <p className="text-white/30 text-xs mt-1">{w.description}</p>
                    )}
                    {w.status === 'active' && days > 0 && (
                      <button onClick={() => setClaimModal(w)}
                        className="mt-2 flex items-center gap-1.5 text-blue-400
                          hover:text-blue-300 text-xs font-medium transition-colors">
                        <Plus size={12} /> File a Claim
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* ── Claim Modal ───────────────────────────────── */}
      {claimModal && (
        <Modal isOpen={!!claimModal} onClose={() => setClaimModal(null)} title="File Warranty Claim" size="sm">
          <div className="space-y-4">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <p className="text-white text-sm font-semibold">{claimModal.job_description}</p>
              <p className="text-white/40 text-xs">{claimModal.vehicle_name} • {claimModal.garage_name}</p>
            </div>
            <div>
              <label className="text-white/60 text-xs font-medium mb-1 block">
                Describe the issue *
              </label>
              <textarea rows={3} placeholder="What went wrong? What needs to be fixed under warranty?"
                value={claimDesc} onChange={(e) => setClaimDesc(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5
                  text-white placeholder-white/30 text-sm focus:outline-none
                  focus:ring-2 focus:ring-blue-500/50 resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setClaimModal(null)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                  rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                Cancel
              </button>
              <button
                onClick={() => claimMutation.mutate({ warranty_id: claimModal.id, description: claimDesc })}
                disabled={claimMutation.isPending || !claimDesc.trim()}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white
                  font-semibold rounded-xl py-2.5 text-sm transition-all disabled:opacity-50
                  flex items-center justify-center gap-2">
                {claimMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting...</>
                  : 'Submit Claim'
                }
              </button>
            </div>
          </div>
        </Modal>
      )}
    </PageWrapper>
  );
};

export default MyWarranties;