import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  FileText, Plus, Search, Eye, Trash2,
  CreditCard, TrendingUp, Clock, CheckCircle,
  User, Car, Wrench, DollarSign,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAllInvoicesApi, createInvoiceApi, processPaymentApi,
  deleteInvoiceApi, getBillingSummaryApi,
} from '../../api/invoiceApi';
import { getAllJobCardsApi } from '../../api/jobCardApi';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';
import StatCard from '../../components/common/StatCard';

// ─── Helpers ──────────────────────────────────────────────
const getStatusBadge = (status) => {
  const map = {
    pending:        { variant: 'warning', label: 'Pending' },
    paid:           { variant: 'success', label: 'Paid' },
    partially_paid: { variant: 'info',    label: 'Partial' },
    overdue:        { variant: 'danger',  label: 'Overdue' },
  };
  return map[status] || { variant: 'neutral', label: status };
};

const PAYMENT_METHODS = [
  { value: 'cash',           label: 'Cash' },
  { value: 'mpesa',          label: 'M-Pesa' },
  { value: 'card',           label: 'Card' },
  { value: 'invoice_credit', label: 'Invoice Credit' },
];

const formatCurrency = (amount) =>
  `KES ${parseFloat(amount || 0).toLocaleString()}`;

// ─── Schemas ──────────────────────────────────────────────
const createSchema = z.object({
  job_id:      z.string().min(1, 'Please select a job.'),
  labour_cost: z.coerce.number().min(0, 'Labour cost cannot be negative.'),
  notes:       z.string().optional(),
});

const paymentSchema = z.object({
  payment_method: z.string().min(1, 'Please select a payment method.'),
  amount_paid:    z.coerce.number().min(1, 'Amount must be greater than 0.'),
});

const Field = ({ label, error, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-white/70 text-sm font-medium">{label}</label>
    {children}
    {error && <p className="text-red-400 text-xs">{error}</p>}
  </div>
);

const inputClass = (hasError) =>
  `w-full bg-white/10 border rounded-xl px-4 py-2.5 text-white
   placeholder-white/30 text-sm focus:outline-none focus:ring-2
   focus:ring-blue-500/50 transition-all duration-200
   ${hasError ? 'border-red-400/50' : 'border-white/20'}`;

const InvoiceManagement = () => {
  const queryClient = useQueryClient();
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate]     = useState(false);
  const [viewInvoice, setViewInvoice]   = useState(null);
  const [payInvoice, setPayInvoice]     = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // ─── Queries ──────────────────────────────────────────
  const { data, isLoading } = useQuery({ queryKey: ['invoices'],  queryFn: getAllInvoicesApi });
  const { data: summaryData } = useQuery({ queryKey: ['billingSummary'], queryFn: getBillingSummaryApi });
  const { data: jobCardsData } = useQuery({ queryKey: ['jobCards'], queryFn: getAllJobCardsApi });

  // ─── Mutations ────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createInvoiceApi,
    onSuccess: () => {
      toast.success('Invoice created successfully.');
      queryClient.invalidateQueries(['invoices', 'billingSummary']);
      setShowCreate(false); resetCreate();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create invoice.'),
  });

  const paymentMutation = useMutation({
    mutationFn: ({ id, data }) => processPaymentApi(id, data),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries(['invoices', 'billingSummary']);
      setPayInvoice(null); resetPayment();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to process payment.'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInvoiceApi,
    onSuccess: () => {
      toast.success('Invoice deleted successfully.');
      queryClient.invalidateQueries(['invoices', 'billingSummary']);
      setConfirmDelete(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete invoice.'),
  });

  // ─── Forms ────────────────────────────────────────────
  const {
    register: registerCreate,
    handleSubmit: handleCreate,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm({ resolver: zodResolver(createSchema) });

  const {
    register: registerPayment,
    handleSubmit: handlePayment,
    reset: resetPayment,
    formState: { errors: paymentErrors },
  } = useForm({ resolver: zodResolver(paymentSchema) });

  const onCreateSubmit = (data) => createMutation.mutate(data);
  const onPaymentSubmit = (data) => paymentMutation.mutate({ id: payInvoice.id, data });

  // ─── Filter ───────────────────────────────────────────
  const invoices = data?.data || [];
  const summary  = summaryData?.data || {};
  const jobCards = jobCardsData?.data || [];

  // Only show completed jobs without an invoice
  const invoicedJobIds = new Set(invoices.map((i) => i.job_id));
  const eligibleJobs   = jobCards.filter(
    (j) => j.status === 'completed' && !invoicedJobIds.has(j.id)
  );

  const filtered = invoices.filter((i) => {
    const matchSearch =
      `${i.client_name} ${i.vehicle_name} ${i.plate_number} ${i.job_description}`
        .toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <PageWrapper title="Invoices" subtitle="Manage all client invoices and payments.">

      {/* ── Summary Cards ───────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Invoices" value={summary.total_invoices || 0}          icon={FileText}    color="blue" />
        <StatCard title="Total Billed"   value={formatCurrency(summary.total_billed)} icon={TrendingUp}  color="purple" />
        <StatCard title="Collected"      value={formatCurrency(summary.total_collected)} icon={CheckCircle} color="emerald" />
        <StatCard title="Pending"        value={formatCurrency(summary.total_pending)} icon={Clock}       color="amber" />
      </div>

      {/* ── Top Bar ────────────────────────────────────── */}
      <GlassCard className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl
                  pl-9 pr-4 py-2 text-white placeholder-white/30 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-2
                text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all"           className="bg-slate-800">All Statuses</option>
              <option value="pending"       className="bg-slate-800">Pending</option>
              <option value="partially_paid"className="bg-slate-800">Partially Paid</option>
              <option value="paid"          className="bg-slate-800">Paid</option>
              <option value="overdue"       className="bg-slate-800">Overdue</option>
            </select>
          </div>
          <button
            onClick={() => { setShowCreate(true); resetCreate(); }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500
              hover:from-blue-600 hover:to-indigo-600 text-white font-semibold
              rounded-xl px-4 py-2 text-sm shadow-lg shadow-blue-500/30
              transition-all duration-200 whitespace-nowrap"
          >
            <Plus size={16} /> New Invoice
          </button>
        </div>
      </GlassCard>

      {/* ── Invoices Table ──────────────────────────────── */}
      <GlassCard className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="md" text="Loading invoices..." />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <FileText size={36} className="text-white/20" />
            <p className="text-white/40 text-sm">No invoices found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {['Client', 'Vehicle', 'Job', 'Amount', 'Payment', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-white/50 text-xs font-semibold
                      uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((inv) => {
                  const badge = getStatusBadge(inv.status);
                  return (
                    <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-white text-sm font-medium">{inv.client_name}</p>
                        <p className="text-white/40 text-xs">{inv.client_phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white/70 text-sm">{inv.vehicle_name}</p>
                        <p className="text-white/40 text-xs font-mono">{inv.plate_number}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white/60 text-xs max-w-[180px] truncate">
                          {inv.job_description}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white font-semibold text-sm">
                          {formatCurrency(inv.total_amount)}
                        </p>
                        <p className="text-white/30 text-xs">
                          Labour: {formatCurrency(inv.labour_cost)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white/60 text-sm capitalize">
                          {inv.payment_method?.replace('_', ' ') || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge label={badge.label} variant={badge.variant} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setViewInvoice(inv)}
                            className="p-1.5 rounded-lg text-white/40 hover:text-blue-400
                              hover:bg-blue-500/10 transition-all" title="View">
                            <Eye size={15} />
                          </button>
                          {inv.status !== 'paid' && (
                            <button
                              onClick={() => { setPayInvoice(inv); resetPayment(); }}
                              className="p-1.5 rounded-lg text-white/40 hover:text-emerald-400
                                hover:bg-emerald-500/10 transition-all" title="Record Payment">
                              <CreditCard size={15} />
                            </button>
                          )}
                          {inv.status !== 'paid' && (
                            <button onClick={() => setConfirmDelete(inv)}
                              className="p-1.5 rounded-lg text-white/40 hover:text-red-400
                                hover:bg-red-500/10 transition-all" title="Delete">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* ── Create Invoice Modal ────────────────────────── */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); resetCreate(); }} title="New Invoice" size="md">
        <form onSubmit={handleCreate(onCreateSubmit)} className="space-y-4">
          <Field label="Completed Job" error={createErrors.job_id?.message}>
            <select {...registerCreate('job_id')} className={inputClass(!!createErrors.job_id)}>
              <option value="" className="bg-slate-800">Select completed job...</option>
              {eligibleJobs.map((j) => (
                <option key={j.id} value={j.id} className="bg-slate-800">
                  {j.description} — {j.vehicle_name} ({j.plate_number})
                </option>
              ))}
            </select>
            {eligibleJobs.length === 0 && (
              <p className="text-white/40 text-xs mt-1">
                No completed jobs without an invoice available.
              </p>
            )}
          </Field>
          <Field label="Labour Cost (KES)" error={createErrors.labour_cost?.message}>
            <input
              type="number" min="0" step="0.01" placeholder="0.00"
              {...registerCreate('labour_cost')}
              className={inputClass(!!createErrors.labour_cost)}
            />
          </Field>
          <Field label="Notes (optional)" error={createErrors.notes?.message}>
            <textarea
              rows={3} placeholder="Any additional notes..."
              {...registerCreate('notes')}
              className={`${inputClass(false)} resize-none`}
            />
          </Field>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowCreate(false); resetCreate(); }}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                rounded-xl py-2.5 text-sm border border-white/20 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500
                hover:from-blue-600 hover:to-indigo-600 text-white font-semibold
                rounded-xl py-2.5 text-sm shadow-lg shadow-blue-500/30
                transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {createMutation.isPending
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</>
                : 'Create Invoice'
              }
            </button>
          </div>
        </form>
      </Modal>

      {/* ── View Invoice Modal ──────────────────────────── */}
      {viewInvoice && (
        <Modal isOpen={!!viewInvoice} onClose={() => setViewInvoice(null)} title="Invoice Details" size="md">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4
              bg-white/5 rounded-xl border border-white/10">
              <div>
                <p className="text-white/40 text-xs">Invoice Total</p>
                <p className="text-white text-2xl font-bold">
                  {formatCurrency(viewInvoice.total_amount)}
                </p>
              </div>
              <Badge
                label={getStatusBadge(viewInvoice.status).label}
                variant={getStatusBadge(viewInvoice.status).variant}
              />
            </div>
            {/* Details */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: User,       label: 'Client',       value: viewInvoice.client_name },
                { icon: Car,        label: 'Vehicle',      value: `${viewInvoice.vehicle_name} (${viewInvoice.plate_number})` },
                { icon: Wrench,     label: 'Job',          value: viewInvoice.job_description },
                { icon: DollarSign, label: 'Labour Cost',  value: formatCurrency(viewInvoice.labour_cost) },
                { icon: DollarSign, label: 'Parts Cost',   value: formatCurrency(viewInvoice.parts_cost) },
                { icon: CreditCard, label: 'Payment',      value: viewInvoice.payment_method?.replace('_', ' ') || 'Not paid' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-2 p-3
                  bg-white/5 rounded-xl border border-white/10">
                  <Icon size={14} className="text-white/40 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white/40 text-xs">{label}</p>
                    <p className="text-white text-sm">{value}</p>
                  </div>
                </div>
              ))}
            </div>
            {viewInvoice.notes && (
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/40 text-xs mb-1">Notes</p>
                <p className="text-white text-sm">{viewInvoice.notes}</p>
              </div>
            )}
            {/* Dates */}
            <div className="flex gap-3 text-xs text-white/40">
              <span>Issued: {new Date(viewInvoice.issued_at).toLocaleDateString('en-KE')}</span>
              {viewInvoice.paid_at && (
                <span>• Paid: {new Date(viewInvoice.paid_at).toLocaleDateString('en-KE')}</span>
              )}
            </div>
            {/* Pay button */}
            {viewInvoice.status !== 'paid' && (
              <button
                onClick={() => { setViewInvoice(null); setPayInvoice(viewInvoice); resetPayment(); }}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500
                  text-white font-semibold rounded-xl py-2.5 text-sm
                  flex items-center justify-center gap-2 transition-all">
                <CreditCard size={15} /> Record Payment
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* ── Payment Modal ───────────────────────────────── */}
      {payInvoice && (
        <Modal isOpen={!!payInvoice} onClose={() => { setPayInvoice(null); resetPayment(); }} title="Record Payment" size="sm">
          <form onSubmit={handlePayment(onPaymentSubmit)} className="space-y-4">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <p className="text-white/40 text-xs">Invoice Total</p>
              <p className="text-white font-bold text-lg">
                {formatCurrency(payInvoice.total_amount)}
              </p>
              <p className="text-white/40 text-xs mt-1">{payInvoice.client_name}</p>
            </div>
            <Field label="Payment Method" error={paymentErrors.payment_method?.message}>
              <select {...registerPayment('payment_method')} className={inputClass(!!paymentErrors.payment_method)}>
                <option value="" className="bg-slate-800">Select method...</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value} className="bg-slate-800">{m.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Amount Paid (KES)" error={paymentErrors.amount_paid?.message}>
              <input
                type="number" min="1" step="0.01"
                placeholder={parseFloat(payInvoice.total_amount).toFixed(2)}
                {...registerPayment('amount_paid')}
                className={inputClass(!!paymentErrors.amount_paid)}
              />
            </Field>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setPayInvoice(null); resetPayment(); }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                  rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                Cancel
              </button>
              <button type="submit" disabled={paymentMutation.isPending}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500
                  text-white font-semibold rounded-xl py-2.5 text-sm
                  transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {paymentMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                  : 'Record Payment'
                }
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Confirm Delete Modal ────────────────────────── */}
      {confirmDelete && (
        <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Invoice" size="sm">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30
              flex items-center justify-center mx-auto">
              <Trash2 size={24} className="text-red-400" />
            </div>
            <div>
              <p className="text-white font-medium">Delete this invoice?</p>
              <p className="text-white/50 text-sm mt-1">
                Invoice for <span className="text-white font-semibold">{confirmDelete.client_name}</span> —{' '}
                {formatCurrency(confirmDelete.total_amount)} will be permanently removed.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                  rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                Cancel
              </button>
              <button onClick={() => deleteMutation.mutate(confirmDelete.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-gradient-to-r from-red-500 to-rose-500
                  text-white font-semibold rounded-xl py-2.5 text-sm
                  transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {deleteMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting...</>
                  : 'Delete'
                }
              </button>
            </div>
          </div>
        </Modal>
      )}

    </PageWrapper>
  );
};

export default InvoiceManagement;