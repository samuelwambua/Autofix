import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Search, Eye, CheckCircle, Clock } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';
import StatCard from '../../components/common/StatCard';

const fetchMyInvoices = async () => {
  const res = await axiosInstance.get('/invoices/my-invoices');
  return res.data;
};

const getStatusBadge = (status) => {
  const map = {
    pending:        { variant: 'warning', label: 'Pending' },
    paid:           { variant: 'success', label: 'Paid' },
    partially_paid: { variant: 'info',    label: 'Partial' },
    overdue:        { variant: 'danger',  label: 'Overdue' },
  };
  return map[status] || { variant: 'neutral', label: status };
};

const formatCurrency = (amount) =>
  `KES ${parseFloat(amount || 0).toLocaleString()}`;

const MyInvoices = () => {
  const [search, setSearch]         = useState('');
  const [viewInvoice, setViewInvoice] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['myInvoices'],
    queryFn: fetchMyInvoices,
  });

  const invoices     = data?.data || [];
  const totalSpent   = invoices.filter(i => i.status === 'paid')
    .reduce((a, i) => a + parseFloat(i.total_amount), 0);
  const totalPending = invoices.filter(i => i.status !== 'paid')
    .reduce((a, i) => a + parseFloat(i.total_amount), 0);

  const filtered = invoices.filter((i) =>
    `${i.vehicle_name} ${i.plate_number} ${i.job_description}`
      .toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageWrapper title="My Invoices" subtitle="View all your service invoices and payment history.">

      {/* ── Summary Cards ───────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Invoices" value={invoices.length}                    icon={FileText}    color="blue" />
        <StatCard title="Total Paid"     value={formatCurrency(totalSpent)}         icon={CheckCircle} color="emerald" />
        <StatCard title="Outstanding"    value={formatCurrency(totalPending)}       icon={Clock}       color={totalPending > 0 ? 'rose' : 'emerald'} />
      </div>

      {/* ── Search ───────────────────────────────────────── */}
      <GlassCard className="p-4 mb-6">
        <div className="relative max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text" placeholder="Search invoices..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-xl
              pl-9 pr-4 py-2 text-white placeholder-white/30 text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
      </GlassCard>

      {/* ── Invoices List ────────────────────────────────── */}
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
              <GlassCard
                key={inv.id}
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
                      <p className="text-white font-bold text-sm">
                        {formatCurrency(inv.total_amount)}
                      </p>
                      <Badge label={badge.label} variant={badge.variant} />
                    </div>
                    <p className="text-white/50 text-xs mt-0.5 truncate">{inv.job_description}</p>
                    <p className="text-white/30 text-xs mt-0.5">
                      {inv.vehicle_name} • {inv.plate_number}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-white/25">
                      <span>Labour: {formatCurrency(inv.labour_cost)}</span>
                      <span>Parts: {formatCurrency(inv.parts_cost)}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white/30 text-xs">
                      {new Date(inv.issued_at).toLocaleDateString('en-KE')}
                    </p>
                    {inv.payment_method && (
                      <p className="text-white/20 text-xs capitalize mt-0.5">
                        {inv.payment_method.replace('_', ' ')}
                      </p>
                    )}
                  </div>
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
            {/* Total */}
            <div className="flex items-center justify-between p-4
              bg-white/5 rounded-xl border border-white/10">
              <div>
                <p className="text-white/40 text-xs">Total Amount</p>
                <p className="text-white text-2xl font-bold">
                  {formatCurrency(viewInvoice.total_amount)}
                </p>
              </div>
              <Badge
                label={getStatusBadge(viewInvoice.status).label}
                variant={getStatusBadge(viewInvoice.status).variant}
              />
            </div>
            {[
              { label: 'Vehicle',    value: `${viewInvoice.vehicle_name} (${viewInvoice.plate_number})` },
              { label: 'Job',        value: viewInvoice.job_description },
              { label: 'Labour',     value: formatCurrency(viewInvoice.labour_cost) },
              { label: 'Parts',      value: formatCurrency(viewInvoice.parts_cost) },
              { label: 'Payment',    value: viewInvoice.payment_method?.replace('_', ' ') || 'Pending' },
              { label: 'Issued',     value: new Date(viewInvoice.issued_at).toLocaleDateString('en-KE') },
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

export default MyInvoices;