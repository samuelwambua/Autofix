import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Search, Eye, Edit, Clock, Package,
  Wrench, Plus, Trash2, CheckCircle, X, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';
import StatCard from '../../components/common/StatCard';
import CreateQuoteModal from '../../components/common/CreateQuoteModal';

const fetchQuotes   = () => axiosInstance.get('/quotes').then(r => r.data);
const fetchById     = (id) => axiosInstance.get(`/quotes/${id}`).then(r => r.data);
const fetchJobCards = () => axiosInstance.get('/job-cards').then(r => r.data);
const fetchInventory = () => axiosInstance.get('/inventory').then(r => r.data);

const fmt = (v) => `KES ${parseFloat(v || 0).toLocaleString()}`;

const statusBadge = (status) => ({
  pending:  { variant: 'warning', label: 'Pending' },
  approved: { variant: 'success', label: 'Approved' },
  rejected: { variant: 'danger',  label: 'Rejected' },
  revised:  { variant: 'info',    label: 'Revised' },
  expired:  { variant: 'neutral', label: 'Expired' },
}[status] || { variant: 'neutral', label: status });

const inputClass = 'w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50';

const QuoteManagement = () => {
  const queryClient = useQueryClient();
  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState('all');
  const [viewQuote, setViewQuote]     = useState(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [reviseMode, setReviseMode]   = useState(false);
  const [reviseItems, setReviseItems] = useState([]);
  const [reviseNotes, setReviseNotes] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedJobCard, setSelectedJobCard] = useState(null);

  const { data, isLoading }        = useQuery({ queryKey: ['quotes'],    queryFn: fetchQuotes });
  const { data: jobCardsData }     = useQuery({ queryKey: ['jobCards'],  queryFn: fetchJobCards });
  const { data: inventoryData }    = useQuery({ queryKey: ['inventory'], queryFn: fetchInventory });
  const { data: detailData }       = useQuery({
    queryKey: ['quoteDetail', viewQuote?.id],
    queryFn: () => fetchById(viewQuote?.id),
    enabled: !!viewQuote?.id,
  });

  const reviseMutation = useMutation({
    mutationFn: ({ id, items, notes }) =>
      axiosInstance.put(`/quotes/${id}/revise`, { items, notes }).then(r => r.data),
    onSuccess: (d) => {
      toast.success(d.message);
      queryClient.invalidateQueries(['quotes', 'quoteDetail']);
      setReviseMode(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const quotes   = data?.data || [];
  const detail   = detailData?.data;
  const jobCards = (jobCardsData?.data || []).filter(jc =>
    !['completed'].includes(jc.status)
  );

  const filtered = quotes.filter(q => {
    const matchSearch = `${q.client_name} ${q.vehicle_name} ${q.plate_number} ${q.job_description}`
      .toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || q.status === filter;
    return matchSearch && matchFilter;
  });

  const stats = quotes.reduce((acc, q) => {
    acc[q.status] = (acc[q.status] || 0) + 1;
    return acc;
  }, {});

  const totalValue = quotes
    .filter(q => q.status === 'approved')
    .reduce((a, q) => a + parseFloat(q.total_amount || 0), 0);

  const startRevise = () => {
    setReviseItems(detail?.items?.map(i => ({
      ...i,
      unit_cost: parseFloat(i.unit_cost),
      quantity:  parseFloat(i.quantity),
    })) || []);
    setReviseNotes(detail?.notes || '');
    setReviseMode(true);
  };

  const updateReviseItem = (i, field, value) => {
    const updated = [...reviseItems];
    updated[i] = { ...updated[i], [field]: value };
    setReviseItems(updated);
  };

  const addReviseItem = () => setReviseItems([
    ...reviseItems,
    { item_type: 'part', description: '', quantity: 1, unit_cost: '' },
  ]);

  const removeReviseItem = (i) => setReviseItems(reviseItems.filter((_, idx) => idx !== i));

  const reviseTotal = reviseItems.reduce((a, i) =>
    a + parseFloat(i.quantity || 1) * parseFloat(i.unit_cost || 0), 0);

  return (
    <PageWrapper title="Quote Management" subtitle="Create and manage repair estimates sent to clients.">

      {/* ── Stats ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Pending"       value={stats.pending  || 0} icon={Clock}       color="amber" />
        <StatCard title="Approved"      value={stats.approved || 0} icon={CheckCircle} color="emerald" />
        <StatCard title="Rejected"      value={stats.rejected || 0} icon={X}           color="rose" />
        <StatCard title="Approved Value" value={fmt(totalValue)}    icon={FileText}    color="blue" />
      </div>

      {/* ── Top Bar ───────────────────────────────────── */}
      <GlassCard className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input type="text" placeholder="Search by client, vehicle..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-4 py-2
                text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl px-3 py-2
              text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
            <option value="all"      className="bg-slate-800">All Statuses</option>
            <option value="pending"  className="bg-slate-800">Pending</option>
            <option value="approved" className="bg-slate-800">Approved</option>
            <option value="rejected" className="bg-slate-800">Rejected</option>
            <option value="revised"  className="bg-slate-800">Revised</option>
            <option value="expired"  className="bg-slate-800">Expired</option>
          </select>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500
              hover:from-blue-600 hover:to-indigo-600 text-white font-semibold
              rounded-xl px-4 py-2 text-sm shadow-lg transition-all whitespace-nowrap ml-auto">
            <Plus size={15} /> Create Quote
          </button>
        </div>
      </GlassCard>

      {/* ── Quotes List ───────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="md" text="Loading quotes..." />
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-16 gap-3">
          <FileText size={36} className="text-white/20" />
          <p className="text-white/40 text-sm">No quotes found.</p>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30
              text-blue-300 text-xs font-semibold rounded-xl px-4 py-2
              border border-blue-500/30 transition-all">
            <Plus size={13} /> Create First Quote
          </button>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => {
            const badge     = statusBadge(q.status);
            const isPending = q.status === 'pending' || q.status === 'revised';
            return (
              <GlassCard key={q.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                    ${isPending ? 'bg-amber-500/20' : q.status === 'approved' ? 'bg-emerald-500/20' : 'bg-white/10'}`}>
                    <FileText size={16} className={
                      isPending ? 'text-amber-400' :
                      q.status === 'approved' ? 'text-emerald-400' : 'text-white/40'
                    } />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                      <p className="text-white font-bold text-sm">{fmt(q.total_amount)}</p>
                      <Badge label={badge.label} variant={badge.variant} />
                    </div>
                    <p className="text-white/60 text-xs truncate">{q.job_description}</p>
                    <p className="text-white/40 text-xs">{q.client_name} • {q.vehicle_name} • {q.plate_number}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-white/25">
                      <span>Labour: {fmt(q.labour_cost)}</span>
                      <span>Parts: {fmt(q.parts_cost)}</span>
                      <span>{new Date(q.created_at).toLocaleDateString('en-KE')}</span>
                    </div>
                    {q.rejection_reason && (
                      <p className="text-amber-400/70 text-xs mt-1 truncate">
                        💬 {q.rejection_reason}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => { setViewQuote(q); setReviseMode(false); }}
                      className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all"
                      title="View">
                      <Eye size={15} />
                    </button>
                    {(q.status === 'rejected' || q.status === 'pending') && (
                      <button onClick={() => { setViewQuote(q); setReviseMode(false); setTimeout(startRevise, 100); }}
                        className="p-2 rounded-xl text-white/40 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                        title="Revise">
                        <Edit size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* ── Job Card Picker Modal — shown first ────────── */}
      {showCreate && !selectedJobCard && (
        <Modal isOpen={true} onClose={() => setShowCreate(false)} title="Select Job Card" size="md">
          <div className="space-y-3">
            <p className="text-white/60 text-sm">Select a job card to create a quote for:</p>
            {jobCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <AlertTriangle size={28} className="text-white/20" />
                <p className="text-white/30 text-sm">No active job cards found.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {jobCards.map((jc) => (
                  <button key={jc.id}
                    onClick={() => setSelectedJobCard(jc)}
                    className="w-full flex items-start gap-3 p-3 bg-white/5 hover:bg-white/10
                      rounded-xl border border-white/10 hover:border-blue-500/30
                      text-left transition-all">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center
                      justify-center flex-shrink-0">
                      <FileText size={14} className="text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{jc.description}</p>
                      <p className="text-white/40 text-xs">
                        {jc.vehicle_name} • {jc.plate_number}
                      </p>
                      <p className="text-white/30 text-xs">{jc.client_name}</p>
                    </div>
                    <span className="text-xs bg-white/10 text-white/50 px-2 py-1 rounded-lg
                      capitalize flex-shrink-0 mt-0.5">
                      {jc.status?.replace(/_/g, ' ')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Create Quote Modal — shown after job selected ── */}
      {showCreate && selectedJobCard && (
        <CreateQuoteModal
          isOpen={true}
          onClose={() => { setShowCreate(false); setSelectedJobCard(null); }}
          jobCard={selectedJobCard}
        />
      )}

      {/* ── View / Revise Modal ───────────────────────── */}
      {viewQuote && detail && (
        <Modal
          isOpen={!!viewQuote}
          onClose={() => { setViewQuote(null); setReviseMode(false); }}
          title={reviseMode ? 'Revise Quote' : 'Quote Details'}
          size="md"
        >
          <div className="space-y-4">
            {!reviseMode ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-white font-bold text-xl">{fmt(detail.total_amount)}</p>
                    <p className="text-white/50 text-xs">
                      {detail.client_name} • {detail.client_phone}
                    </p>
                  </div>
                  <Badge
                    label={statusBadge(detail.status).label}
                    variant={statusBadge(detail.status).variant}
                  />
                </div>

                {/* Job info */}
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-white text-sm font-semibold">{detail.job_description}</p>
                  <p className="text-white/40 text-xs">
                    {detail.vehicle_name} • {detail.plate_number}
                  </p>
                  <p className="text-white/30 text-xs mt-0.5">
                    Created by {detail.created_by_name} •{' '}
                    {new Date(detail.created_at).toLocaleDateString('en-KE')}
                  </p>
                </div>

                {/* Items breakdown */}
                <div>
                  <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">
                    Cost Breakdown
                  </p>
                  <div className="space-y-2">
                    {detail.items?.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5
                        bg-white/5 rounded-xl border border-white/10">
                        <div className={`w-7 h-7 rounded-lg flex items-center
                          justify-center flex-shrink-0
                          ${item.item_type === 'labour' ? 'bg-blue-500/20' : 'bg-purple-500/20'}`}>
                          {item.item_type === 'labour'
                            ? <Wrench  size={12} className="text-blue-400" />
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

                {/* Totals */}
                <div className="bg-white/5 rounded-xl border border-white/10 p-3 space-y-1.5">
                  {[
                    { label: 'Labour', value: detail.labour_cost, color: 'text-blue-300' },
                    { label: 'Parts',  value: detail.parts_cost,  color: 'text-purple-300' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-white/50">{label}</span>
                      <span className={color}>{fmt(value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold
                    border-t border-white/10 pt-1.5 mt-1">
                    <span className="text-white">Total</span>
                    <span className="text-white text-base">{fmt(detail.total_amount)}</span>
                  </div>
                </div>

                {detail.notes && (
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-white/40 text-xs mb-1">Notes</p>
                    <p className="text-white/70 text-sm">{detail.notes}</p>
                  </div>
                )}

                {detail.rejection_reason && (
                  <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                    <p className="text-amber-400/70 text-xs mb-1">Client message</p>
                    <p className="text-amber-200 text-sm">{detail.rejection_reason}</p>
                  </div>
                )}

                {/* Actions */}
                {(detail.status === 'rejected' || detail.status === 'pending') && (
                  <button onClick={startRevise}
                    className="w-full flex items-center justify-center gap-2
                      bg-gradient-to-r from-blue-500 to-indigo-500
                      hover:from-blue-600 hover:to-indigo-600
                      text-white font-semibold rounded-xl py-2.5 text-sm transition-all">
                    <Edit size={15} /> Revise & Resend Quote
                  </button>
                )}
              </>
            ) : (
              <>
                {/* Revise Mode */}
                <p className="text-white/60 text-sm">
                  Update the quote items and resubmit to the client.
                </p>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {reviseItems.map((item, i) => (
                    <div key={i} className="bg-white/5 rounded-xl border border-white/10 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <select value={item.item_type}
                          onChange={(e) => updateReviseItem(i, 'item_type', e.target.value)}
                          className="bg-white/10 border border-white/20 rounded-xl px-2 py-1.5
                            text-white text-xs focus:outline-none">
                          <option value="labour" className="bg-slate-800">Labour</option>
                          <option value="part"   className="bg-slate-800">Part</option>
                          <option value="other"  className="bg-slate-800">Other</option>
                        </select>
                        {reviseItems.length > 1 && (
                          <button onClick={() => removeReviseItem(i)}
                            className="p-1 text-red-400/50 hover:text-red-400 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input placeholder="Description" value={item.description}
                          onChange={(e) => updateReviseItem(i, 'description', e.target.value)}
                          className={`${inputClass} col-span-3 sm:col-span-1`} />
                        <input type="number" placeholder="Qty" value={item.quantity}
                          onChange={(e) => updateReviseItem(i, 'quantity', e.target.value)}
                          className={inputClass} />
                        <input type="number" placeholder="Unit Cost" value={item.unit_cost}
                          onChange={(e) => updateReviseItem(i, 'unit_cost', e.target.value)}
                          className={inputClass} />
                      </div>
                      {item.unit_cost && (
                        <p className="text-white/30 text-xs text-right">
                          Subtotal: {fmt(parseFloat(item.quantity || 1) * parseFloat(item.unit_cost || 0))}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <button onClick={addReviseItem}
                  className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300
                    text-xs transition-colors">
                  <Plus size={13} /> Add Item
                </button>

                <textarea rows={2} placeholder="Add a note to client (optional)..."
                  value={reviseNotes} onChange={(e) => setReviseNotes(e.target.value)}
                  className={`${inputClass} resize-none`} />

                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-white">New Total</span>
                    <span className="text-emerald-400">{fmt(reviseTotal)}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setReviseMode(false)}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                      rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                    Back
                  </button>
                  <button
                    onClick={() => reviseMutation.mutate({
                      id: detail.id,
                      items: reviseItems.map(i => ({
                        ...i,
                        unit_cost: parseFloat(i.unit_cost),
                        quantity:  parseFloat(i.quantity || 1),
                      })),
                      notes: reviseNotes,
                    })}
                    disabled={reviseMutation.isPending || reviseTotal === 0}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500
                      text-white font-semibold rounded-xl py-2.5 text-sm
                      transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {reviseMutation.isPending
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending...</>
                      : `Send Revised — ${fmt(reviseTotal)}`
                    }
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </PageWrapper>
  );
};

export default QuoteManagement;