import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, FileText, Wrench, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import Modal from './Modal';

const fetchInventory = () => axiosInstance.get('/inventory').then(r => r.data);

const ITEM_TYPES = [
  { value: 'labour', label: 'Labour', icon: Wrench },
  { value: 'part',   label: 'Part',   icon: Package },
  { value: 'other',  label: 'Other',  icon: FileText },
];

const inputClass = "w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all";

const CreateQuoteModal = ({ isOpen, onClose, jobCard }) => {
  const queryClient = useQueryClient();
  const [notes, setNotes]       = useState('');
  const [validDays, setValidDays] = useState(3);
  const [items, setItems]       = useState([
    { item_type: 'labour', description: '', quantity: 1, unit_cost: '', part_id: null },
  ]);

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory'],
    queryFn: fetchInventory,
    enabled: isOpen,
  });

  const inventory = inventoryData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data) => axiosInstance.post('/quotes', data).then(r => r.data),
    onSuccess: (d) => {
      toast.success(d.message);
      queryClient.invalidateQueries(['quotes', 'jobCards']);
      onClose();
      resetForm();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create quote.'),
  });

  const resetForm = () => {
    setNotes(''); setValidDays(3);
    setItems([{ item_type: 'labour', description: '', quantity: 1, unit_cost: '', part_id: null }]);
  };

  const addItem = () => setItems([...items, { item_type: 'part', description: '', quantity: 1, unit_cost: '', part_id: null }]);

  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));

  const updateItem = (i, field, value) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: value };
    // Auto-fill price if part selected
    if (field === 'part_id' && value) {
      const part = inventory.find(p => p.id === value);
      if (part) {
        updated[i].description = part.name;
        updated[i].unit_cost   = part.unit_cost;
      }
    }
    setItems(updated);
  };

  const totalLabour = items.filter(i => i.item_type === 'labour')
    .reduce((a, i) => a + (parseFloat(i.quantity || 1) * parseFloat(i.unit_cost || 0)), 0);
  const totalParts = items.filter(i => i.item_type !== 'labour')
    .reduce((a, i) => a + (parseFloat(i.quantity || 1) * parseFloat(i.unit_cost || 0)), 0);
  const grandTotal = totalLabour + totalParts;

  const handleSubmit = () => {
    const invalid = items.some(i => !i.description || !i.unit_cost);
    if (invalid) { toast.error('Please fill in all item descriptions and costs.'); return; }
    createMutation.mutate({
      job_card_id: jobCard?.id,
      notes,
      valid_days: validDays,
      items: items.map(i => ({ ...i, unit_cost: parseFloat(i.unit_cost), quantity: parseFloat(i.quantity || 1) })),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); resetForm(); }} title="Create Quote" size="lg">
      <div className="space-y-4">

        {/* Job Info */}
        {jobCard && (
          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <p className="text-white text-sm font-semibold">{jobCard.description}</p>
            <p className="text-white/50 text-xs">{jobCard.vehicle_name} • {jobCard.plate_number} • {jobCard.client_name}</p>
          </div>
        )}

        {/* Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-white/70 text-sm font-medium">Quote Items</label>
            <button onClick={addItem}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs transition-colors">
              <Plus size={13} /> Add Item
            </button>
          </div>

          {items.map((item, i) => (
            <div key={i} className="bg-white/5 rounded-xl border border-white/10 p-3 space-y-2">
              <div className="flex items-center gap-2">
                {/* Type */}
                <select value={item.item_type} onChange={(e) => updateItem(i, 'item_type', e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-xl px-2 py-2 text-white text-xs
                    focus:outline-none focus:ring-2 focus:ring-blue-500/50 flex-shrink-0">
                  {ITEM_TYPES.map(t => (
                    <option key={t.value} value={t.value} className="bg-slate-800">{t.label}</option>
                  ))}
                </select>

                {/* Part selector */}
                {item.item_type === 'part' && (
                  <select value={item.part_id || ''} onChange={(e) => updateItem(i, 'part_id', e.target.value || null)}
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-2 py-2 text-white text-xs
                      focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                    <option value="" className="bg-slate-800">Select part (optional)</option>
                    {inventory.map(p => (
                      <option key={p.id} value={p.id} className="bg-slate-800">
                        {p.name} — KES {parseFloat(p.unit_cost).toLocaleString()}
                      </option>
                    ))}
                  </select>
                )}

                {items.length > 1 && (
                  <button onClick={() => removeItem(i)}
                    className="p-1.5 text-red-400/50 hover:text-red-400 transition-colors flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-3 sm:col-span-1">
                  <input placeholder="Description" value={item.description}
                    onChange={(e) => updateItem(i, 'description', e.target.value)}
                    className={inputClass} />
                </div>
                <input type="number" placeholder="Qty" min="1" value={item.quantity}
                  onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                  className={inputClass} />
                <input type="number" placeholder="Unit Cost (KES)" value={item.unit_cost}
                  onChange={(e) => updateItem(i, 'unit_cost', e.target.value)}
                  className={inputClass} />
              </div>

              {item.unit_cost && (
                <p className="text-white/40 text-xs text-right">
                  Subtotal: KES {(parseFloat(item.quantity || 1) * parseFloat(item.unit_cost || 0)).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-3 space-y-1.5">
          {[
            { label: 'Labour',     value: totalLabour, color: 'text-blue-300' },
            { label: 'Parts',      value: totalParts,  color: 'text-purple-300' },
            { label: 'Total',      value: grandTotal,  color: 'text-white', bold: true },
          ].map(({ label, value, color, bold }) => (
            <div key={label} className={`flex justify-between text-sm ${bold ? 'border-t border-white/10 pt-1.5 mt-1' : ''}`}>
              <span className="text-white/50">{label}</span>
              <span className={`${color} ${bold ? 'font-bold text-base' : 'font-medium'}`}>
                KES {value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {/* Notes & validity */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
            <label className="text-white/70 text-sm font-medium">Notes (optional)</label>
            <textarea rows={2} placeholder="Any additional notes for the client..."
              value={notes} onChange={(e) => setNotes(e.target.value)}
              className={`${inputClass} resize-none`} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-white/70 text-sm font-medium">Valid for (days)</label>
            <select value={validDays} onChange={(e) => setValidDays(parseInt(e.target.value))}
              className={inputClass}>
              {[1, 2, 3, 5, 7].map(d => (
                <option key={d} value={d} className="bg-slate-800">{d} day{d > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button onClick={() => { onClose(); resetForm(); }}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
              rounded-xl py-2.5 text-sm border border-white/20 transition-all">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={createMutation.isPending || grandTotal === 0}
            className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold
              rounded-xl py-2.5 text-sm transition-all disabled:opacity-50
              flex items-center justify-center gap-2">
            {createMutation.isPending
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending...</>
              : `Send Quote — KES ${grandTotal.toLocaleString()}`
            }
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateQuoteModal;