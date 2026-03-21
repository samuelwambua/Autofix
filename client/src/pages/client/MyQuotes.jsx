import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { FileText, CheckCircle, X, MessageSquare, ChevronRight, Clock, Wrench, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';

const fetchMyQuotes = () => axiosInstance.get('/quotes/my-quotes').then(r => r.data);
const fetchQuoteById = (id) => axiosInstance.get(`/quotes/${id}`).then(r => r.data);

const getStatusBadge = (status) => {
  const map = {
    pending:  { variant: 'warning', label: 'Awaiting Your Approval' },
    approved: { variant: 'success', label: 'Approved' },
    rejected: { variant: 'danger',  label: 'Rejected' },
    revised:  { variant: 'info',    label: 'Revised — Review Again' },
    expired:  { variant: 'neutral', label: 'Expired' },
  };
  return map[status] || { variant: 'neutral', label: status };
};

const fmt = (v) => `KES ${parseFloat(v || 0).toLocaleString()}`;

const MyQuotes = () => {
  const queryClient = useQueryClient();
  const [viewQuote, setViewQuote]         = useState(null);
  const [showReject, setShowReject]       = useState(false);
  const [showAlternative, setShowAlternative] = useState(false);
  const [rejectReason, setRejectReason]   = useState('');
  const [altMessage, setAltMessage]       = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['myQuotes'], queryFn: fetchMyQuotes });
  const { data: quoteDetail } = useQuery({
    queryKey: ['quoteDetail', viewQuote?.id],
    queryFn: () => fetchQuoteById(viewQuote?.id),
    enabled: !!viewQuote?.id,
  });

  const approveMutation = useMutation({
    mutationFn: (id) => axiosInstance.put(`/quotes/${id}/approve`).then(r => r.data),
    onSuccess: (d) => {
      toast.success(d.message);
      queryClient.invalidateQueries(['myQuotes', 'clientDashboard']);
      setViewQuote(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => axiosInstance.put(`/quotes/${id}/reject`, { reason }).then(r => r.data),
    onSuccess: (d) => {
      toast.success(d.message);
      queryClient.invalidateQueries(['myQuotes']);
      setViewQuote(null); setShowReject(false); setRejectReason('');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const alternativeMutation = useMutation({
    mutationFn: ({ id, message }) => axiosInstance.put(`/quotes/${id}/request-alternative`, { message }).then(r => r.data),
    onSuccess: (d) => {
      toast.success(d.message);
      queryClient.invalidateQueries(['myQuotes']);
      setViewQuote(null); setShowAlternative(false); setAltMessage('');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const quotes = data?.data || [];
  const detail = quoteDetail?.data;

  const pendingCount = quotes.filter(q => q.status === 'pending' || q.status === 'revised').length;

  return (
    <PageWrapper title="Repair Quotes" subtitle="Review and approve repair estimates from your garage.">

      {/* ── Pending Alert ──────────────────────────────── */}
      {pendingCount > 0 && (
        <div className="mb-6 bg-amber-500/20 border border-amber-500/40 rounded-2xl p-4
          flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/30 flex items-center justify-center flex-shrink-0">
            <Clock size={18} className="text-amber-300" />
          </div>
          <div>
            <p className="text-amber-200 font-semibold text-sm">
              {pendingCount} quote{pendingCount > 1 ? 's' : ''} awaiting your approval
            </p>
            <p className="text-amber-300/60 text-xs">
              Review and approve to allow work to begin on your vehicle.
            </p>
          </div>
        </div>
      )}

      {/* ── Quotes List ────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="md" text="Loading quotes..." />
        </div>
      ) : quotes.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-16 gap-3">
          <FileText size={36} className="text-white/20" />
          <p className="text-white/40 text-sm">No quotes yet.</p>
          <p className="text-white/25 text-xs">When a garage prepares a repair estimate, it will appear here.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {quotes.map((q) => {
            const badge    = getStatusBadge(q.status);
            const isPending = q.status === 'pending' || q.status === 'revised';
            const isExpired = q.valid_until && new Date(q.valid_until) < new Date() && isPending;
            return (
              <GlassCard key={q.id}
                className={`p-4 cursor-pointer hover:bg-white/15 transition-all
                  ${isPending && !isExpired ? 'border-2 border-amber-500/30' : ''}`}
                onClick={() => setViewQuote(q)}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                    ${isPending ? 'bg-amber-500/20' : q.status === 'approved' ? 'bg-emerald-500/20' : 'bg-white/10'}`}>
                    <FileText size={16} className={isPending ? 'text-amber-400' : q.status === 'approved' ? 'text-emerald-400' : 'text-white/40'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className="text-white font-bold text-sm">{fmt(q.total_amount)}</p>
                      <Badge label={badge.label} variant={badge.variant} />
                    </div>
                    <p className="text-white/50 text-xs mt-0.5 truncate">{q.job_description}</p>
                    <p className="text-white/30 text-xs">{q.vehicle_name} • {q.plate_number}</p>
                    <p className="text-white/30 text-xs">{q.garage_name}</p>
                    {isPending && q.valid_until && (
                      <p className={`text-xs mt-1 font-medium ${isExpired ? 'text-red-400' : 'text-amber-400'}`}>
                        {isExpired ? '⚠ Expired' : `⏱ Valid until ${new Date(q.valid_until).toLocaleDateString('en-KE')}`}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-white/30 flex-shrink-0 mt-1" />
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* ── Quote Detail Modal ────────────────────────── */}
      {viewQuote && detail && (
        <Modal isOpen={!!viewQuote} onClose={() => setViewQuote(null)} title="Repair Quote" size="md">
          <div className="space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-white font-bold text-xl">{fmt(detail.total_amount)}</p>
                <p className="text-white/50 text-xs">{detail.garage_name} • {detail.garage_phone}</p>
              </div>
              <Badge label={getStatusBadge(detail.status).label} variant={getStatusBadge(detail.status).variant} />
            </div>

            {/* Vehicle & Job */}
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <p className="text-white text-sm font-semibold">{detail.job_description}</p>
              <p className="text-white/40 text-xs">{detail.vehicle_name} ({detail.plate_number})</p>
            </div>

            {/* Items breakdown */}
            <div>
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Cost Breakdown</p>
              <div className="space-y-2">
                {detail.items?.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 bg-white/5 rounded-xl border border-white/10">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
                      ${item.item_type === 'labour' ? 'bg-blue-500/20' : 'bg-purple-500/20'}`}>
                      {item.item_type === 'labour'
                        ? <Wrench size={12} className="text-blue-400" />
                        : <Package size={12} className="text-purple-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{item.description}</p>
                      <p className="text-white/30 text-xs capitalize">
                        {item.item_type} × {item.quantity}
                      </p>
                    </div>
                    <p className="text-white font-semibold text-sm flex-shrink-0">
                      {fmt(item.total_cost)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Labour</span>
                <span className="text-blue-300">{fmt(detail.labour_cost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Parts</span>
                <span className="text-purple-300">{fmt(detail.parts_cost)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-white/10 pt-1.5 mt-1">
                <span className="text-white">Total</span>
                <span className="text-white text-base">{fmt(detail.total_amount)}</span>
              </div>
            </div>

            {detail.notes && (
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/40 text-xs mb-1">Notes from garage</p>
                <p className="text-white/70 text-sm">{detail.notes}</p>
              </div>
            )}

            {/* Actions — only for pending/revised */}
            {(detail.status === 'pending' || detail.status === 'revised') &&
              new Date(detail.valid_until) > new Date() && (
              <div className="space-y-2 pt-1">
                <button onClick={() => approveMutation.mutate(detail.id)}
                  disabled={approveMutation.isPending}
                  className="w-full flex items-center justify-center gap-2
                    bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold
                    rounded-xl py-3 text-sm shadow-lg shadow-emerald-500/30
                    transition-all disabled:opacity-50">
                  {approveMutation.isPending
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Approving...</>
                    : <><CheckCircle size={16} /> Approve & Start Repair</>
                  }
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setShowAlternative(true)}
                    className="flex items-center justify-center gap-1.5 bg-blue-500/20
                      hover:bg-blue-500/30 text-blue-300 text-xs font-semibold
                      rounded-xl py-2.5 border border-blue-500/30 transition-all">
                    <MessageSquare size={13} /> Request Alternative
                  </button>
                  <button onClick={() => setShowReject(true)}
                    className="flex items-center justify-center gap-1.5 bg-red-500/20
                      hover:bg-red-500/30 text-red-400 text-xs font-semibold
                      rounded-xl py-2.5 border border-red-500/30 transition-all">
                    <X size={13} /> Reject Quote
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Reject Modal ──────────────────────────────── */}
      {showReject && (
        <Modal isOpen={showReject} onClose={() => setShowReject(false)} title="Reject Quote" size="sm">
          <div className="space-y-4">
            <p className="text-white/60 text-sm">Tell the garage why you are rejecting this quote.</p>
            <textarea rows={3} placeholder="Reason for rejection (optional)..."
              value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5
                text-white placeholder-white/30 text-sm focus:outline-none
                focus:ring-2 focus:ring-red-500/50 resize-none" />
            <div className="flex gap-3">
              <button onClick={() => setShowReject(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                  rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                Cancel
              </button>
              <button onClick={() => rejectMutation.mutate({ id: viewQuote?.id, reason: rejectReason })}
                disabled={rejectMutation.isPending}
                className="flex-1 bg-gradient-to-r from-red-500 to-rose-500 text-white font-semibold
                  rounded-xl py-2.5 text-sm transition-all disabled:opacity-50
                  flex items-center justify-center gap-2">
                {rejectMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Rejecting...</>
                  : 'Reject Quote'
                }
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Request Alternative Modal ─────────────────── */}
      {showAlternative && (
        <Modal isOpen={showAlternative} onClose={() => setShowAlternative(false)} title="Request Cheaper Alternative" size="sm">
          <div className="space-y-4">
            <p className="text-white/60 text-sm">Let the garage know what you are looking for in a cheaper alternative.</p>
            <textarea rows={3} placeholder="e.g. Can you use a local part instead of an OEM part?..."
              value={altMessage} onChange={(e) => setAltMessage(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5
                text-white placeholder-white/30 text-sm focus:outline-none
                focus:ring-2 focus:ring-blue-500/50 resize-none" />
            <div className="flex gap-3">
              <button onClick={() => setShowAlternative(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                  rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                Cancel
              </button>
              <button onClick={() => alternativeMutation.mutate({ id: viewQuote?.id, message: altMessage })}
                disabled={alternativeMutation.isPending}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold
                  rounded-xl py-2.5 text-sm transition-all disabled:opacity-50
                  flex items-center justify-center gap-2">
                {alternativeMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending...</>
                  : 'Send Request'
                }
              </button>
            </div>
          </div>
        </Modal>
      )}

    </PageWrapper>
  );
};

export default MyQuotes;