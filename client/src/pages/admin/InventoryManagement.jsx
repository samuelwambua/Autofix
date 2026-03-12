import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Package, Plus, Search, Eye, Trash2,
  Edit2, AlertTriangle, RefreshCw, TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAllInventoryApi, createInventoryItemApi,
  updateInventoryItemApi, deleteInventoryItemApi,
  restockInventoryApi, getInventorySummaryApi,
} from '../../api/inventoryApi';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';
import StatCard from '../../components/common/StatCard';

// ─── Schema ───────────────────────────────────────────────
const itemSchema = z.object({
  name:               z.string().min(2, 'Name must be at least 2 characters.'),
  sku:                z.string().min(2, 'SKU is required.'),
  quantity:           z.coerce.number().min(0, 'Quantity cannot be negative.'),
  unit_cost:          z.coerce.number().min(0, 'Unit cost cannot be negative.'),
  reorder_threshold:  z.coerce.number().min(0, 'Reorder threshold cannot be negative.'),
  supplier_name:      z.string().optional(),
  supplier_contact:   z.string().optional(),
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

const InventoryManagement = () => {
  const queryClient = useQueryClient();
  const [search, setSearch]               = useState('');
  const [showForm, setShowForm]           = useState(false);
  const [editItem, setEditItem]           = useState(null);
  const [viewItem, setViewItem]           = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [restockItem, setRestockItem]     = useState(null);
  const [restockQty, setRestockQty]       = useState(1);

  // ─── Queries ──────────────────────────────────────────
  const { data, isLoading } = useQuery({ queryKey: ['inventory'], queryFn: getAllInventoryApi });
  const { data: summaryData } = useQuery({ queryKey: ['inventorySummary'], queryFn: getInventorySummaryApi });

  // ─── Mutations ────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createInventoryItemApi,
    onSuccess: () => {
      toast.success('Item added successfully.');
      queryClient.invalidateQueries(['inventory', 'inventorySummary']);
      setShowForm(false); reset();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add item.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateInventoryItemApi(id, data),
    onSuccess: () => {
      toast.success('Item updated successfully.');
      queryClient.invalidateQueries(['inventory', 'inventorySummary']);
      setEditItem(null); reset();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update item.'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInventoryItemApi,
    onSuccess: () => {
      toast.success('Item deleted successfully.');
      queryClient.invalidateQueries(['inventory', 'inventorySummary']);
      setConfirmDelete(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete item.'),
  });

  const restockMutation = useMutation({
    mutationFn: ({ id, quantity }) => restockInventoryApi(id, { quantity }),
    onSuccess: () => {
      toast.success('Item restocked successfully.');
      queryClient.invalidateQueries(['inventory', 'inventorySummary']);
      setRestockItem(null); setRestockQty(1);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to restock item.'),
  });

  // ─── Form ─────────────────────────────────────────────
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(itemSchema),
  });

  const openEdit = (item) => {
    setEditItem(item);
    reset({
      name:              item.name,
      sku:               item.sku,
      quantity:          item.quantity,
      unit_cost:         item.unit_cost,
      reorder_threshold: item.reorder_threshold,
      supplier_name:     item.supplier_name || '',
      supplier_contact:  item.supplier_contact || '',
    });
  };

  const onSubmit = (data) => {
    if (editItem) updateMutation.mutate({ id: editItem.id, data });
    else createMutation.mutate(data);
  };

  // ─── Filter ───────────────────────────────────────────
  const items   = data?.data || [];
  const summary = summaryData?.data || {};

  const filtered = items.filter((i) =>
    `${i.name} ${i.sku} ${i.supplier_name}`
      .toLowerCase().includes(search.toLowerCase())
  );

  const lowStockItems = items.filter((i) => i.quantity <= i.reorder_threshold);
  const isSubmitting  = createMutation.isPending || updateMutation.isPending;

  return (
    <PageWrapper title="Inventory" subtitle="Manage spare parts and inventory stock.">

      {/* ── Summary Cards ───────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Items"  value={items.length}          icon={Package}       color="blue" />
        <StatCard title="Total Stock"  value={items.reduce((a, i) => a + i.quantity, 0)} icon={TrendingUp} color="emerald" />
        <StatCard title="Low Stock"    value={lowStockItems.length}  icon={AlertTriangle} color={lowStockItems.length > 0 ? 'rose' : 'emerald'} />
        <StatCard title="Stock Value"  value={`KES ${items.reduce((a, i) => a + (parseFloat(i.unit_cost) * i.quantity), 0).toLocaleString()}`} icon={TrendingUp} color="purple" />
      </div>

      {/* ── Low Stock Alert ─────────────────────────────── */}
      {lowStockItems.length > 0 && (
        <GlassCard className="p-4 mb-6 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-amber-300 font-semibold text-sm">Low Stock Alert</p>
              <p className="text-amber-400/70 text-xs mt-0.5">
                {lowStockItems.map((i) => i.name).join(', ')} — need restocking.
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ── Top Bar ────────────────────────────────────── */}
      <GlassCard className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl
                pl-9 pr-4 py-2 text-white placeholder-white/30 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <button
            onClick={() => { setShowForm(true); setEditItem(null); reset(); }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500
              hover:from-blue-600 hover:to-indigo-600 text-white font-semibold
              rounded-xl px-4 py-2 text-sm shadow-lg shadow-blue-500/30
              transition-all duration-200 whitespace-nowrap"
          >
            <Plus size={16} /> Add Item
          </button>
        </div>
      </GlassCard>

      {/* ── Inventory Table ─────────────────────────────── */}
      <GlassCard className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="md" text="Loading inventory..." />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Package size={36} className="text-white/20" />
            <p className="text-white/40 text-sm">No inventory items found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {['Item', 'SKU', 'Supplier', 'Stock', 'Unit Cost', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-white/50 text-xs font-semibold
                      uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((item) => {
                  const isLow = item.quantity <= item.reorder_threshold;
                  return (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0
                            ${isLow ? 'bg-amber-500/20' : 'bg-blue-500/20'}`}>
                            <Package size={15} className={isLow ? 'text-amber-400' : 'text-blue-400'} />
                          </div>
                          <p className="text-white text-sm font-medium">{item.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-white/60 text-xs bg-white/5
                          border border-white/10 rounded-lg px-2 py-1">
                          {item.sku}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white/60 text-sm">{item.supplier_name || '—'}</p>
                        <p className="text-white/30 text-xs">{item.supplier_contact || ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className={`text-sm font-semibold ${isLow ? 'text-amber-400' : 'text-white'}`}>
                          {item.quantity}
                        </p>
                        <p className="text-white/30 text-xs">Min: {item.reorder_threshold}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white/70 text-sm">
                          KES {parseFloat(item.unit_cost).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          label={isLow ? 'Low Stock' : 'In Stock'}
                          variant={isLow ? 'warning' : 'success'}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setViewItem(item)}
                            className="p-1.5 rounded-lg text-white/40 hover:text-blue-400
                              hover:bg-blue-500/10 transition-all" title="View">
                            <Eye size={15} />
                          </button>
                          <button onClick={() => openEdit(item)}
                            className="p-1.5 rounded-lg text-white/40 hover:text-amber-400
                              hover:bg-amber-500/10 transition-all" title="Edit">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => { setRestockItem(item); setRestockQty(1); }}
                            className="p-1.5 rounded-lg text-white/40 hover:text-emerald-400
                              hover:bg-emerald-500/10 transition-all" title="Restock">
                            <RefreshCw size={15} />
                          </button>
                          <button onClick={() => setConfirmDelete(item)}
                            className="p-1.5 rounded-lg text-white/40 hover:text-red-400
                              hover:bg-red-500/10 transition-all" title="Delete">
                            <Trash2 size={15} />
                          </button>
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

      {/* ── Add / Edit Item Modal ───────────────────────── */}
      <Modal
        isOpen={showForm || !!editItem}
        onClose={() => { setShowForm(false); setEditItem(null); reset(); }}
        title={editItem ? 'Edit Item' : 'Add Inventory Item'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Item Name" error={errors.name?.message}>
              <input type="text" placeholder="e.g. Oil Filter"
                {...register('name')} className={inputClass(!!errors.name)} />
            </Field>
            <Field label="SKU" error={errors.sku?.message}>
              <input type="text" placeholder="e.g. OIL-FLT-001"
                {...register('sku')} className={inputClass(!!errors.sku)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Supplier Name" error={errors.supplier_name?.message}>
              <input type="text" placeholder="e.g. AutoParts Kenya"
                {...register('supplier_name')} className={inputClass(!!errors.supplier_name)} />
            </Field>
            <Field label="Supplier Contact" error={errors.supplier_contact?.message}>
              <input type="text" placeholder="e.g. 0711999888"
                {...register('supplier_contact')} className={inputClass(!!errors.supplier_contact)} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Quantity" error={errors.quantity?.message}>
              <input type="number" min="0" placeholder="0"
                {...register('quantity')} className={inputClass(!!errors.quantity)} />
            </Field>
            <Field label="Unit Cost (KES)" error={errors.unit_cost?.message}>
              <input type="number" min="0" step="0.01" placeholder="0.00"
                {...register('unit_cost')} className={inputClass(!!errors.unit_cost)} />
            </Field>
            <Field label="Reorder Threshold" error={errors.reorder_threshold?.message}>
              <input type="number" min="0" placeholder="e.g. 5"
                {...register('reorder_threshold')} className={inputClass(!!errors.reorder_threshold)} />
            </Field>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button"
              onClick={() => { setShowForm(false); setEditItem(null); reset(); }}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                rounded-xl py-2.5 text-sm border border-white/20 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500
                hover:from-blue-600 hover:to-indigo-600 text-white font-semibold
                rounded-xl py-2.5 text-sm shadow-lg shadow-blue-500/30
                transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {isSubmitting
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                : editItem ? 'Update Item' : 'Add Item'
              }
            </button>
          </div>
        </form>
      </Modal>

      {/* ── View Item Modal ─────────────────────────────── */}
      {viewItem && (
        <Modal isOpen={!!viewItem} onClose={() => setViewItem(null)} title="Item Details" size="sm">
          <div className="space-y-3">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30
                flex items-center justify-center">
                <Package size={20} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-bold">{viewItem.name}</h3>
                <span className="font-mono text-white/40 text-xs">{viewItem.sku}</span>
              </div>
            </div>
            {[
              { label: 'Supplier',          value: viewItem.supplier_name || 'N/A' },
              { label: 'Supplier Contact',  value: viewItem.supplier_contact || 'N/A' },
              { label: 'In Stock',          value: viewItem.quantity },
              { label: 'Reorder Threshold', value: viewItem.reorder_threshold },
              { label: 'Unit Cost',         value: `KES ${parseFloat(viewItem.unit_cost).toLocaleString()}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between p-3
                bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/40 text-sm">{label}</p>
                <p className="text-white text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* ── Restock Modal ───────────────────────────────── */}
      {restockItem && (
        <Modal isOpen={!!restockItem} onClose={() => { setRestockItem(null); setRestockQty(1); }} title="Restock Item" size="sm">
          <div className="space-y-4">
            <p className="text-white/60 text-sm">
              Restocking: <span className="text-white font-medium">{restockItem.name}</span>
              <br />
              Current stock: <span className="text-white font-medium">{restockItem.quantity}</span>
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-white/70 text-sm font-medium">Quantity to Add</label>
              <input
                type="number" min={1} value={restockQty}
                onChange={(e) => setRestockQty(parseInt(e.target.value))}
                className={inputClass(false)}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setRestockItem(null); setRestockQty(1); }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                  rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                Cancel
              </button>
              <button
                onClick={() => restockMutation.mutate({ id: restockItem.id, quantity: restockQty })}
                disabled={restockQty < 1 || restockMutation.isPending}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500
                  text-white font-semibold rounded-xl py-2.5 text-sm
                  transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {restockMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Restocking...</>
                  : 'Restock'
                }
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Confirm Delete Modal ────────────────────────── */}
      {confirmDelete && (
        <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Item" size="sm">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30
              flex items-center justify-center mx-auto">
              <Trash2 size={24} className="text-red-400" />
            </div>
            <div>
              <p className="text-white font-medium">Delete this item?</p>
              <p className="text-white/50 text-sm mt-1">
                <span className="text-white font-semibold">{confirmDelete.name}</span> will be permanently removed.
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

export default InventoryManagement;