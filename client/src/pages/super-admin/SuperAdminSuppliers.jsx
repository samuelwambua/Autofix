import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Store, Search, Eye, CheckCircle, X, AlertTriangle,
  MessageSquare, Shield, Ban, MapPin, Phone, Mail,
  FileText, BadgeCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import SuperAdminLayout from './SuperAdminLayout';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';

const fetchSuppliers = () => axiosInstance.get('/super-admin/suppliers').then(r => r.data);
const fetchById = (id) => axiosInstance.get(`/super-admin/suppliers/${id}`).then(r => r.data);

const STATUS_BADGE = {
  pending:   { variant: 'warning', label: 'Pending' },
  active:    { variant: 'success', label: 'Active' },
  rejected:  { variant: 'danger',  label: 'Rejected' },
  suspended: { variant: 'danger',  label: 'Suspended' },
};

const SuperAdminSuppliers = () => {
  const queryClient = useQueryClient();
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState('all');
  const [viewId, setViewId]         = useState(null);
  const [showReject, setShowReject] = useState(false);
  const [showInfo, setShowInfo]     = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [infoMessage, setInfoMessage]   = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['superAdminSuppliers'], queryFn: fetchSuppliers });
  const { data: detailData } = useQuery({
    queryKey: ['supplierDetail', viewId],
    queryFn: () => fetchById(viewId),
    enabled: !!viewId,
  });

  const mutation = (endpoint, opts = {}) => useMutation({
    mutationFn: (payload) =>
      axiosInstance.put(`/super-admin/suppliers/${viewId || payload}/${endpoint}`,
        typeof payload === 'object' ? payload : {}).then(r => r.data),
    onSuccess: (d) => {
      toast.success(d.message);
      queryClient.invalidateQueries(['superAdminSuppliers', 'supplierDetail']);
      if (opts.closeModal) { setShowReject(false); setShowInfo(false); }
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const approveMutation = useMutation({
    mutationFn: (id) => axiosInstance.put(`/super-admin/suppliers/${id}/approve`).then(r => r.data),
    onSuccess: (d) => { toast.success(d.message); queryClient.invalidateQueries(['superAdminSuppliers', 'supplierDetail']); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) =>
      axiosInstance.put(`/super-admin/suppliers/${id}/reject`, { reason }).then(r => r.data),
    onSuccess: (d) => {
      toast.success(d.message);
      queryClient.invalidateQueries(['superAdminSuppliers', 'supplierDetail']);
      setShowReject(false); setRejectReason('');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const infoMutation = useMutation({
    mutationFn: ({ id, message }) =>
      axiosInstance.put(`/super-admin/suppliers/${id}/request-info`, { message }).then(r => r.data),
    onSuccess: (d) => {
      toast.success(d.message);
      queryClient.invalidateQueries(['superAdminSuppliers']);
      setShowInfo(false); setInfoMessage('');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const suspendMutation = useMutation({
    mutationFn: (id) => axiosInstance.put(`/super-admin/suppliers/${id}/suspend`).then(r => r.data),
    onSuccess: (d) => { toast.success(d.message); queryClient.invalidateQueries(['superAdminSuppliers', 'supplierDetail']); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const suppliers = data?.data || [];
  const detail    = detailData?.data;

  const filtered = suppliers.filter(s => {
    const matchSearch = `${s.business_name} ${s.city} ${s.email} ${s.phone}`
      .toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || s.status === filter;
    return matchSearch && matchFilter;
  });

  const pending = suppliers.filter(s => s.status === 'pending').length;

  return (
    <SuperAdminLayout
      title="Supplier Verification"
      subtitle="Review and manage supplier applications."
    >
      {/* ── Pending Alert ───────────────────────────────── */}
      {pending > 0 && (
        <div className="mb-6 bg-amber-500/20 border border-amber-500/40 rounded-2xl p-4
          flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
          <p className="text-amber-200 font-semibold text-sm">
            {pending} supplier application{pending > 1 ? 's' : ''} pending review
          </p>
        </div>
      )}

      {/* ── Stats ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total',     value: suppliers.length,                             color: 'text-white' },
          { label: 'Pending',   value: suppliers.filter(s=>s.status==='pending').length,   color: 'text-amber-400' },
          { label: 'Active',    value: suppliers.filter(s=>s.status==='active').length,    color: 'text-emerald-400' },
          { label: 'Rejected',  value: suppliers.filter(s=>s.status==='rejected').length,  color: 'text-red-400' },
        ].map(({ label, value, color }) => (
          <GlassCard key={label} className="p-4">
            <p className={`font-bold text-2xl ${color}`}>{value}</p>
            <p className="text-white/40 text-xs mt-0.5">{label}</p>
          </GlassCard>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────── */}
      <GlassCard className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input type="text" placeholder="Search suppliers..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-4 py-2
                text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl px-3 py-2
              text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50">
            <option value="all"      className="bg-slate-800">All</option>
            <option value="pending"  className="bg-slate-800">Pending</option>
            <option value="active"   className="bg-slate-800">Active</option>
            <option value="rejected" className="bg-slate-800">Rejected</option>
            <option value="suspended" className="bg-slate-800">Suspended</option>
          </select>
        </div>
      </GlassCard>

      {/* ── Suppliers List ───────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="md" text="Loading suppliers..." /></div>
      ) : filtered.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-16 gap-2">
          <Store size={36} className="text-white/20" />
          <p className="text-white/40 text-sm">No suppliers found.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const badge = STATUS_BADGE[s.status] || { variant: 'neutral', label: s.status };
            return (
              <GlassCard key={s.id}
                className={`p-4 ${s.status === 'pending' ? 'border border-amber-500/30' : ''}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0
                    ${s.status === 'active' ? 'bg-emerald-500/20' :
                      s.status === 'pending' ? 'bg-amber-500/20' : 'bg-white/10'}`}>
                    <Store size={20} className={
                      s.status === 'active' ? 'text-emerald-400' :
                      s.status === 'pending' ? 'text-amber-400' : 'text-white/40'
                    } />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-bold text-sm">{s.business_name}</p>
                        {s.is_verified && (
                          <BadgeCheck size={15} className="text-blue-400" />
                        )}
                      </div>
                      <Badge label={badge.label} variant={badge.variant} />
                    </div>
                    <p className="text-white/50 text-xs">{s.owner_name}</p>
                    <p className="text-white/30 text-xs flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin size={10} />{s.city || '—'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone size={10} />{s.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText size={10} />{s.document_count || 0} docs
                      </span>
                    </p>
                    <p className="text-white/20 text-xs capitalize mt-0.5">
                      {s.business_type?.replace(/_/g, ' ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
                    <button onClick={() => setViewId(s.id)}
                      className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all"
                      title="View">
                      <Eye size={15} />
                    </button>
                    {s.status === 'pending' && (
                      <>
                        <button onClick={() => approveMutation.mutate(s.id)}
                          disabled={approveMutation.isPending}
                          className="p-2 rounded-xl text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                          title="Approve">
                          <CheckCircle size={15} />
                        </button>
                        <button onClick={() => { setViewId(s.id); setShowReject(true); }}
                          className="p-2 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Reject">
                          <X size={15} />
                        </button>
                        <button onClick={() => { setViewId(s.id); setShowInfo(true); }}
                          className="p-2 rounded-xl text-white/40 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                          title="Request More Info">
                          <MessageSquare size={15} />
                        </button>
                      </>
                    )}
                    {s.status === 'active' && (
                      <button onClick={() => suspendMutation.mutate(s.id)}
                        className="p-2 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Suspend">
                        <Ban size={15} />
                      </button>
                    )}
                    {s.status === 'suspended' && (
                      <button onClick={() => suspendMutation.mutate(s.id)}
                        className="p-2 rounded-xl text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                        title="Reactivate">
                        <CheckCircle size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* ── View Supplier Modal ────────────────────────── */}
      {viewId && detail && (
        <Modal isOpen={!!viewId} onClose={() => setViewId(null)} title="Supplier Profile" size="md">
          <div className="space-y-3">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/20 border border-orange-500/30
                flex items-center justify-center flex-shrink-0">
                <Store size={24} className="text-orange-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white font-black text-lg">{detail.business_name}</p>
                  {detail.is_verified && <BadgeCheck size={18} className="text-blue-400" />}
                </div>
                <p className="text-white/50 text-sm">{detail.owner_name}</p>
                <Badge
                  label={STATUS_BADGE[detail.status]?.label || detail.status}
                  variant={STATUS_BADGE[detail.status]?.variant || 'neutral'}
                />
              </div>
            </div>

            {[
              { label: 'Email',         value: detail.email },
              { label: 'Phone',         value: detail.phone },
              { label: 'City',          value: detail.city || '—' },
              { label: 'Address',       value: detail.address || '—' },
              { label: 'Business Type', value: detail.business_type?.replace(/_/g, ' ') },
              { label: 'Registered',    value: new Date(detail.created_at).toLocaleDateString('en-KE') },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between p-3
                bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/40 text-sm">{label}</p>
                <p className="text-white text-sm font-medium capitalize">{value}</p>
              </div>
            ))}

            {/* Specializations */}
            {detail.specializations?.length > 0 && (
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/40 text-xs mb-2">Specializations</p>
                <div className="flex flex-wrap gap-1.5">
                  {detail.specializations.map(s => (
                    <span key={s} className="text-xs bg-orange-500/20 text-orange-300
                      px-2 py-0.5 rounded-full border border-orange-500/30">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            {detail.documents?.length > 0 && (
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/40 text-xs mb-2">Documents ({detail.documents.length})</p>
                <div className="space-y-1.5">
                  {detail.documents.map(doc => (
                    <div key={doc.id} className="flex items-center gap-2">
                      <FileText size={12} className="text-white/40 flex-shrink-0" />
                      <p className="text-white text-xs flex-1 truncate">{doc.file_name}</p>
                      <p className="text-white/30 text-xs capitalize">
                        {doc.document_type?.replace(/_/g, ' ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            {detail.status === 'pending' && (
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button onClick={() => approveMutation.mutate(detail.id)}
                  disabled={approveMutation.isPending}
                  className="flex flex-col items-center gap-1 p-3 bg-emerald-500/20
                    hover:bg-emerald-500/30 text-emerald-400 text-xs font-semibold
                    rounded-xl border border-emerald-500/30 transition-all">
                  <CheckCircle size={16} /> Approve
                </button>
                <button onClick={() => setShowReject(true)}
                  className="flex flex-col items-center gap-1 p-3 bg-red-500/20
                    hover:bg-red-500/30 text-red-400 text-xs font-semibold
                    rounded-xl border border-red-500/30 transition-all">
                  <X size={16} /> Reject
                </button>
                <button onClick={() => setShowInfo(true)}
                  className="flex flex-col items-center gap-1 p-3 bg-amber-500/20
                    hover:bg-amber-500/30 text-amber-400 text-xs font-semibold
                    rounded-xl border border-amber-500/30 transition-all">
                  <MessageSquare size={16} /> More Info
                </button>
              </div>
            )}
            {detail.status === 'active' && (
              <button onClick={() => suspendMutation.mutate(detail.id)}
                className="w-full flex items-center justify-center gap-2 p-3 bg-red-500/20
                  hover:bg-red-500/30 text-red-400 text-sm font-semibold
                  rounded-xl border border-red-500/30 transition-all">
                <Ban size={15} /> Suspend Supplier
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* ── Reject Modal ────────────────────────────────── */}
      {showReject && viewId && (
        <Modal isOpen={showReject} onClose={() => setShowReject(false)} title="Reject Supplier" size="sm">
          <div className="space-y-4">
            <p className="text-white/60 text-sm">Provide a reason for rejection. This will be sent to the supplier.</p>
            <textarea rows={3} placeholder="e.g. Documents are incomplete or illegible..."
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
              <button onClick={() => rejectMutation.mutate({ id: viewId, reason: rejectReason })}
                disabled={rejectMutation.isPending}
                className="flex-1 bg-gradient-to-r from-red-500 to-rose-500 text-white
                  font-semibold rounded-xl py-2.5 text-sm transition-all disabled:opacity-50
                  flex items-center justify-center gap-2">
                {rejectMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Rejecting...</>
                  : 'Reject Application'
                }
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Request Info Modal ───────────────────────────── */}
      {showInfo && viewId && (
        <Modal isOpen={showInfo} onClose={() => setShowInfo(false)} title="Request More Information" size="sm">
          <div className="space-y-4">
            <p className="text-white/60 text-sm">What additional information do you need from this supplier?</p>
            <textarea rows={3} placeholder="e.g. Please upload a clearer copy of your business license..."
              value={infoMessage} onChange={(e) => setInfoMessage(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5
                text-white placeholder-white/30 text-sm focus:outline-none
                focus:ring-2 focus:ring-amber-500/50 resize-none" />
            <div className="flex gap-3">
              <button onClick={() => setShowInfo(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                  rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                Cancel
              </button>
              <button onClick={() => infoMutation.mutate({ id: viewId, message: infoMessage })}
                disabled={infoMutation.isPending}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white
                  font-semibold rounded-xl py-2.5 text-sm transition-all disabled:opacity-50
                  flex items-center justify-center gap-2">
                {infoMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending...</>
                  : <><MessageSquare size={14} /> Send Request</>
                }
              </button>
            </div>
          </div>
        </Modal>
      )}
    </SuperAdminLayout>
  );
};

export default SuperAdminSuppliers;