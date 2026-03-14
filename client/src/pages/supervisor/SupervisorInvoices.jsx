import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Search, Eye, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';
import StatCard from '../../components/common/StatCard';

const fetchMyInvoices = () => axiosInstance.get('/supervisor/invoices').then(r => r.data);

const getStatusBadge = (status) => {
  const map = {
    pending:        { variant: 'warning', label: 'Pending' },
    paid:           { variant: 'success', label: 'Paid' },
    partially_paid: { variant: 'info',    label: 'Partial' },
  };
  return map[status] || { variant: 'neutral', label: status };
};

const fmt = (v) => `KES ${parseFloat(v || 0).toLocaleString()}`;

const SupervisorInvoices = () => {
  const [search, setSearch]           = useState('');
  const [filterStatus, setFilter]     = useState('all');
  const [viewInvoice, setViewInvoice] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['supervisorInvoices'],
    queryFn: fetchMyInvoices,
  });

  const invoices = data?.data || [];
  const totalBilled    = invoices.reduce((a, i) => a + parseFloat(i.total_amount), 0);
  const totalCollected = invoices.filter(i => i.status === 'paid').reduce((a, i) => a + parseFloat(i.total_amount), 0);
  const totalPending   = invoices.filter(i => i.status !== 'paid').reduce((a, i) => a + parseFloat(i.total_amount), 0);

  const filtered = invoices.filter((i) => {
    const matchSearch = `${i.client_name} ${i.vehicle_name} ${i.plate_number} ${i.job_description}`
      .toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || i.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <PageWrapper title="Invoices" subtitle="All invoices for jobs under your supervision.">

      {/* ── Stat Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Billed"   value={fmt(totalBilled)}    icon={TrendingUp}  color="blue" />
        <StatCard title="Collected"      value={fmt(totalCollected)} icon={CheckCircle} color="emerald" />
        <StatCard title="Pending"        value={fmt(totalPending)}   icon={Clock}       color={totalPending > 0 ? 'rose' : 'emerald'} />
      </div>

      {/* ── Filters ──────────────────────────────────────── */}
      <GlassCard className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text" placeholder="Search invoices..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl
                pl-9 pr-4 py-2 text-white placeholder-white/30 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <select
            value={filterStatus} onChange={(e) => setFilter(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl px-3 py-2
              text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="all" className="bg-slate-800">All Statuses</option>
            <option value="pending" className="bg-slate-800">Pending</option>
            <option value="paid" className="bg-slate-800">Paid</option>
            <option value="partially_paid" className="bg-slate-800">Partially Paid</option>
          </select>
        </div>
      </GlassCard>

      {/* ── Invoices List ─────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="md" text="Loading invoices..." />
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-16 gap-2">
          <FileText size={36} className="text-white/20" />
          <p className="text-white/40 text-sm">No invoices found.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => {
            const badge = getStatusBadge(inv.status);
            return (
              <GlassCard key={inv.id}
                className="p-4 hover:bg-white/15 transition-all cursor-pointer"
                onClick={() => setViewInvoice(inv)}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                    ${inv.status === 'paid' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                    <FileText size={16} className={inv.status === 'paid' ? 'text-emerald-400' : 'text-rose-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className="text-white font-bold text-sm">{fmt(inv.total_amount)}</p>
                      <Badge label={badge.label} variant={badge.variant} />
                    </div>
                    <p className="text-white/50 text-xs mt-0.5 truncate">{inv.job_description}</p>
                    <p className="text-white/30 text-xs">{inv.client_name} • {inv.vehicle_name}</p>
                    <div className="flex gap-3 mt-1 text-xs text-white/25">
                      <span>Labour: {fmt(inv.labour_cost)}</span>
                      <span>Parts: {fmt(inv.parts_cost)}</span>
                    </div>
                  </div>
                  <p className="text-white/30 text-xs flex-shrink-0">
                    {new Date(inv.issued_at).toLocaleDateString('en-KE')}
                  </p>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* ── View Invoice Modal ───────────────────────────── */}
      {viewInvoice && (
        <Modal isOpen={!!viewInvoice} onClose={() => setViewInvoice(null)} title="Invoice Details" size="sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
              <div>
                <p className="text-white/40 text-xs">Total Amount</p>
                <p className="text-white text-2xl font-bold">{fmt(viewInvoice.total_amount)}</p>
              </div>
              <Badge label={getStatusBadge(viewInvoice.status).label}
                variant={getStatusBadge(viewInvoice.status).variant} />
            </div>
            {[
              { label: 'Client',   value: viewInvoice.client_name },
              { label: 'Vehicle',  value: `${viewInvoice.vehicle_name} (${viewInvoice.plate_number})` },
              { label: 'Job',      value: viewInvoice.job_description },
              { label: 'Labour',   value: fmt(viewInvoice.labour_cost) },
              { label: 'Parts',    value: fmt(viewInvoice.parts_cost) },
              { label: 'Payment',  value: viewInvoice.payment_method?.replace('_', ' ') || 'Pending' },
              { label: 'Issued',   value: new Date(viewInvoice.issued_at).toLocaleDateString('en-KE') },
              ...(viewInvoice.paid_at ? [{ label: 'Paid On', value: new Date(viewInvoice.paid_at).toLocaleDateString('en-KE') }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start justify-between gap-3 p-3
                bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/40 text-sm flex-shrink-0">{label}</p>
                <p className="text-white text-sm text-right capitalize">{value}</p>
              </div>
            ))}
            {viewInvoice.notes && (
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/40 text-xs mb-1">Notes</p>
                <p className="text-white text-sm">{viewInvoice.notes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

    </PageWrapper>
  );
};

export default SupervisorInvoices;