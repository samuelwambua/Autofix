import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Car, ChevronLeft, Edit, FileText, Bell, CheckCircle,
  X, Plus, Trash2, Calendar, Wrench, Shield, AlertTriangle,
  Clock, Package,
} from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';

const fetchProfile = (id) => axiosInstance.get(`/vehicles-enhanced/${id}/profile`).then(r => r.data);

const inputClass = 'w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all';
const labelClass = 'text-white/60 text-xs font-medium mb-1';

const fmt = (v) => `KES ${parseFloat(v || 0).toLocaleString()}`;

const REMINDER_TYPES = [
  'Oil Change', 'Service Due', 'Tyre Rotation', 'Brake Check',
  'Battery Check', 'Insurance Renewal', 'Inspection Due',
  'Wheel Alignment', 'Air Filter', 'Custom',
];

const DOCUMENT_TYPES = [
  'Logbook', 'Insurance Certificate', 'Inspection Certificate',
  'Purchase Agreement', 'Import Declaration', 'Other',
];

const daysUntil = (date) => {
  if (!date) return null;
  const diff = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
};

const VehicleProfile = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showEdit, setShowEdit]         = useState(false);
  const [showDoc, setShowDoc]           = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [editForm, setEditForm]         = useState({});
  const [docForm, setDocForm]           = useState({ document_type: 'Logbook', file_name: '', expiry_date: '', notes: '' });
  const [reminderForm, setReminderForm] = useState({ reminder_type: 'Oil Change', due_date: '', due_mileage: '', notes: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['vehicleProfile', id],
    queryFn: () => fetchProfile(id),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => axiosInstance.put(`/vehicles-enhanced/${id}/enhanced`, data).then(r => r.data),
    onSuccess: (d) => {
      toast.success(d.message);
      queryClient.invalidateQueries(['vehicleProfile', id]);
      setShowEdit(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update.'),
  });

  const addDocMutation = useMutation({
    mutationFn: (data) => axiosInstance.post(`/vehicles-enhanced/${id}/documents`, data).then(r => r.data),
    onSuccess: (d) => {
      toast.success(d.message);
      queryClient.invalidateQueries(['vehicleProfile', id]);
      setShowDoc(false);
      setDocForm({ document_type: 'Logbook', file_name: '', expiry_date: '', notes: '' });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId) => axiosInstance.delete(`/vehicles-enhanced/documents/${docId}`).then(r => r.data),
    onSuccess: () => { toast.success('Document deleted.'); queryClient.invalidateQueries(['vehicleProfile', id]); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const addReminderMutation = useMutation({
    mutationFn: (data) => axiosInstance.post(`/vehicles-enhanced/${id}/reminders`, data).then(r => r.data),
    onSuccess: (d) => {
      toast.success(d.message);
      queryClient.invalidateQueries(['vehicleProfile', id]);
      setShowReminder(false);
      setReminderForm({ reminder_type: 'Oil Change', due_date: '', due_mileage: '', notes: '' });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const updateReminderMutation = useMutation({
    mutationFn: ({ remId, action }) =>
      axiosInstance.put(`/vehicles-enhanced/reminders/${remId}`, { action }).then(r => r.data),
    onSuccess: () => { queryClient.invalidateQueries(['vehicleProfile', id]); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  if (isLoading) return (
    <PageWrapper title="Vehicle Profile">
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" text="Loading vehicle profile..." />
      </div>
    </PageWrapper>
  );

  const v = data?.data;
  if (!v) return null;

  const insuranceDays   = daysUntil(v.insurance_expiry);
  const pendingReminders = (v.reminders || []).filter(r => !r.is_completed);

  return (
    <PageWrapper title="Vehicle Profile">
      {/* ── Back & Actions ─────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm">
          <ChevronLeft size={18} /> Back
        </button>
        <button onClick={() => { setEditForm({ ...v }); setShowEdit(true); }}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500
            hover:from-blue-600 hover:to-indigo-600 text-white font-semibold
            rounded-xl px-4 py-2 text-sm shadow-lg transition-all">
          <Edit size={14} /> Edit Vehicle
        </button>
      </div>

      {/* ── Insurance Alert ─────────────────────────────── */}
      {insuranceDays !== null && insuranceDays <= 30 && (
        <div className={`mb-5 p-4 rounded-2xl border flex items-center gap-3
          ${insuranceDays <= 7
            ? 'bg-red-500/20 border-red-500/40'
            : 'bg-amber-500/20 border-amber-500/40'
          }`}>
          <AlertTriangle size={18} className={insuranceDays <= 7 ? 'text-red-400' : 'text-amber-400'} />
          <div>
            <p className={`font-semibold text-sm ${insuranceDays <= 7 ? 'text-red-200' : 'text-amber-200'}`}>
              {insuranceDays <= 0
                ? 'Insurance has expired!'
                : `Insurance expires in ${insuranceDays} day${insuranceDays !== 1 ? 's' : ''}`
              }
            </p>
            <p className={`text-xs ${insuranceDays <= 7 ? 'text-red-300/60' : 'text-amber-300/60'}`}>
              Please renew your insurance to avoid penalties.
            </p>
          </div>
        </div>
      )}

      {/* ── Vehicle Header ──────────────────────────────── */}
      <GlassCard className="p-6 mb-5">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600
            flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
            <Car size={28} className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-white font-bold text-2xl">
              {v.make} {v.model}
            </h1>
            <p className="text-white/50 text-sm">{v.plate_number} • {v.year}</p>
            <div className="flex flex-wrap gap-3 mt-3 text-xs">
              {[
                { label: 'Color',        value: v.color },
                { label: 'Fuel',         value: v.fuel_type },
                { label: 'Transmission', value: v.transmission },
                { label: 'Engine',       value: v.engine_size },
              ].filter(f => f.value).map(({ label, value }) => (
                <span key={label} className="bg-white/10 text-white/60
                  px-2.5 py-1 rounded-xl border border-white/10 capitalize">
                  {label}: {value}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Mileage',     value: v.mileage ? `${parseInt(v.mileage).toLocaleString()} km` : '—' },
            { label: 'Total Jobs',  value: v.total_jobs || 0 },
            { label: 'Documents',   value: v.documents?.length || 0 },
            { label: 'Reminders',   value: pendingReminders.length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
              <p className="text-white font-bold text-lg">{value}</p>
              <p className="text-white/40 text-xs">{label}</p>
            </div>
          ))}
        </div>

        {/* VIN & other details */}
        {(v.vin_number || v.purchase_date || v.insurance_expiry) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            {v.vin_number && (
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <p className="text-white/40 text-xs mb-0.5">VIN Number</p>
                <p className="text-white text-sm font-mono">{v.vin_number}</p>
              </div>
            )}
            {v.purchase_date && (
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <p className="text-white/40 text-xs mb-0.5">Purchase Date</p>
                <p className="text-white text-sm">{new Date(v.purchase_date).toLocaleDateString('en-KE')}</p>
              </div>
            )}
            {v.insurance_expiry && (
              <div className={`rounded-xl p-3 border
                ${insuranceDays !== null && insuranceDays <= 30
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-white/5 border-white/10'
                }`}>
                <p className="text-white/40 text-xs mb-0.5">Insurance Expiry</p>
                <p className={`text-sm font-medium
                  ${insuranceDays !== null && insuranceDays <= 30 ? 'text-amber-300' : 'text-white'}`}>
                  {new Date(v.insurance_expiry).toLocaleDateString('en-KE')}
                </p>
              </div>
            )}
          </div>
        )}

        {v.notes && (
          <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10">
            <p className="text-white/40 text-xs mb-1">Notes</p>
            <p className="text-white/70 text-sm">{v.notes}</p>
          </div>
        )}
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* ── Documents ───────────────────────────────────── */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-blue-400" />
              <p className="text-white/70 text-sm font-semibold">Documents</p>
            </div>
            <button onClick={() => setShowDoc(true)}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs transition-colors">
              <Plus size={13} /> Add
            </button>
          </div>

          {v.documents?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <FileText size={24} className="text-white/15" />
              <p className="text-white/30 text-xs">No documents yet.</p>
              <button onClick={() => setShowDoc(true)}
                className="text-blue-400 text-xs hover:text-blue-300 transition-colors">
                Upload your first document
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {v.documents.map((doc) => {
                const docDays = daysUntil(doc.expiry_date);
                return (
                  <div key={doc.id} className="flex items-center gap-3 p-2.5
                    bg-white/5 rounded-xl border border-white/10">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                      ${docDays !== null && docDays <= 30 ? 'bg-amber-500/20' : 'bg-blue-500/20'}`}>
                      <FileText size={13} className={docDays !== null && docDays <= 30 ? 'text-amber-400' : 'text-blue-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate font-medium">{doc.file_name}</p>
                      <p className="text-white/40 text-xs">{doc.document_type}</p>
                      {doc.expiry_date && (
                        <p className={`text-xs ${docDays !== null && docDays <= 30 ? 'text-amber-400' : 'text-white/30'}`}>
                          Expires: {new Date(doc.expiry_date).toLocaleDateString('en-KE')}
                          {docDays !== null && docDays <= 30 && ` (${docDays} days)`}
                        </p>
                      )}
                    </div>
                    <button onClick={() => deleteDocMutation.mutate(doc.id)}
                      className="p-1.5 text-red-400/40 hover:text-red-400 transition-colors flex-shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* ── Maintenance Reminders ───────────────────────── */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-amber-400" />
              <p className="text-white/70 text-sm font-semibold">Maintenance Reminders</p>
            </div>
            <button onClick={() => setShowReminder(true)}
              className="flex items-center gap-1 text-amber-400 hover:text-amber-300 text-xs transition-colors">
              <Plus size={13} /> Add
            </button>
          </div>

          {pendingReminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <Bell size={24} className="text-white/15" />
              <p className="text-white/30 text-xs">No reminders set.</p>
              <button onClick={() => setShowReminder(true)}
                className="text-amber-400 text-xs hover:text-amber-300 transition-colors">
                Set a maintenance reminder
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingReminders.map((rem) => {
                const remDays = daysUntil(rem.due_date);
                const isOverdue = remDays !== null && remDays < 0;
                const isDueSoon = remDays !== null && remDays <= 7 && remDays >= 0;
                return (
                  <div key={rem.id} className={`flex items-center gap-3 p-2.5 rounded-xl border
                    ${isOverdue ? 'bg-red-500/10 border-red-500/20' :
                      isDueSoon ? 'bg-amber-500/10 border-amber-500/20' :
                      'bg-white/5 border-white/10'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                      ${isOverdue ? 'bg-red-500/20' : isDueSoon ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
                      <Clock size={13} className={isOverdue ? 'text-red-400' : isDueSoon ? 'text-amber-400' : 'text-emerald-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{rem.reminder_type}</p>
                      {rem.due_date && (
                        <p className={`text-xs ${isOverdue ? 'text-red-400' : isDueSoon ? 'text-amber-400' : 'text-white/30'}`}>
                          {isOverdue ? `Overdue by ${Math.abs(remDays)} days` :
                           isDueSoon ? `Due in ${remDays} days` :
                           `Due: ${new Date(rem.due_date).toLocaleDateString('en-KE')}`}
                        </p>
                      )}
                      {rem.due_mileage && (
                        <p className="text-white/30 text-xs">At {parseInt(rem.due_mileage).toLocaleString()} km</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => updateReminderMutation.mutate({ remId: rem.id, action: 'complete' })}
                        className="p-1.5 text-emerald-400/40 hover:text-emerald-400 transition-colors" title="Mark complete">
                        <CheckCircle size={14} />
                      </button>
                      <button onClick={() => updateReminderMutation.mutate({ remId: rem.id, action: 'dismiss' })}
                        className="p-1.5 text-white/20 hover:text-white/60 transition-colors" title="Dismiss">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>

      {/* ── Service History ─────────────────────────────── */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Wrench size={15} className="text-purple-400" />
          <p className="text-white/70 text-sm font-semibold">Service History</p>
        </div>

        {v.service_history?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Wrench size={28} className="text-white/15" />
            <p className="text-white/30 text-sm">No service history yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {v.service_history?.map((job) => (
              <div key={job.id} className="flex items-start gap-3 p-3
                bg-white/5 rounded-xl border border-white/10">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                  ${job.status === 'completed' ? 'bg-emerald-500/20' : 'bg-blue-500/20'}`}>
                  <Wrench size={13} className={job.status === 'completed' ? 'text-emerald-400' : 'text-blue-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{job.description}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-0.5">
                    <p className="text-white/30 text-xs">
                      {job.actual_completion
                        ? new Date(job.actual_completion).toLocaleDateString('en-KE')
                        : new Date(job.created_at).toLocaleDateString('en-KE')
                      }
                    </p>
                    {job.mechanic_name && (
                      <p className="text-white/30 text-xs">by {job.mechanic_name}</p>
                    )}
                    {job.total_amount && (
                      <p className="text-white/50 text-xs font-medium">{fmt(job.total_amount)}</p>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-lg capitalize flex-shrink-0
                  ${job.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {job.status?.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* ── Edit Vehicle Modal ─────────────────────────── */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Vehicle Details" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'make',  label: 'Make',  placeholder: 'Toyota' },
              { key: 'model', label: 'Model', placeholder: 'Corolla' },
              { key: 'year',  label: 'Year',  placeholder: '2020', type: 'number' },
              { key: 'plate_number', label: 'Plate Number', placeholder: 'KDA 123A' },
              { key: 'color', label: 'Color', placeholder: 'Silver' },
              { key: 'mileage', label: 'Mileage (km)', placeholder: '50000', type: 'number' },
              { key: 'engine_size',  label: 'Engine Size',  placeholder: '1800cc' },
              { key: 'fuel_type',    label: 'Fuel Type',    placeholder: 'Petrol' },
              { key: 'transmission', label: 'Transmission', placeholder: 'Automatic' },
              { key: 'vin_number',   label: 'VIN Number',   placeholder: 'JT2BF22K...' },
              { key: 'purchase_date',    label: 'Purchase Date',    type: 'date' },
              { key: 'insurance_expiry', label: 'Insurance Expiry', type: 'date' },
            ].map(({ key, label, placeholder, type = 'text' }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className={labelClass}>{label}</label>
                <input type={type} placeholder={placeholder}
                  value={editForm[key] || ''}
                  onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                  className={inputClass} />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Notes</label>
            <textarea rows={2} placeholder="Any additional notes about this vehicle..."
              value={editForm.notes || ''}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              className={`${inputClass} resize-none`} />
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowEdit(false)}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                rounded-xl py-2.5 text-sm border border-white/20 transition-all">
              Cancel
            </button>
            <button onClick={() => updateMutation.mutate(editForm)}
              disabled={updateMutation.isPending}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold
                rounded-xl py-2.5 text-sm transition-all disabled:opacity-50
                flex items-center justify-center gap-2">
              {updateMutation.isPending
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                : 'Save Changes'
              }
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Add Document Modal ─────────────────────────── */}
      <Modal isOpen={showDoc} onClose={() => setShowDoc(false)} title="Add Document" size="sm">
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Document Type</label>
            <select value={docForm.document_type}
              onChange={(e) => setDocForm({ ...docForm, document_type: e.target.value })}
              className={inputClass}>
              {DOCUMENT_TYPES.map(t => (
                <option key={t} value={t} className="bg-slate-800">{t}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Document Name / File Name</label>
            <input placeholder="e.g. Logbook 2024" value={docForm.file_name}
              onChange={(e) => setDocForm({ ...docForm, file_name: e.target.value })}
              className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Expiry Date (optional)</label>
            <input type="date" value={docForm.expiry_date}
              onChange={(e) => setDocForm({ ...docForm, expiry_date: e.target.value })}
              className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Notes (optional)</label>
            <textarea rows={2} placeholder="Any notes..."
              value={docForm.notes}
              onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })}
              className={`${inputClass} resize-none`} />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowDoc(false)}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                rounded-xl py-2.5 text-sm border border-white/20 transition-all">
              Cancel
            </button>
            <button onClick={() => addDocMutation.mutate(docForm)}
              disabled={addDocMutation.isPending || !docForm.file_name}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold
                rounded-xl py-2.5 text-sm transition-all disabled:opacity-50
                flex items-center justify-center gap-2">
              {addDocMutation.isPending
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Adding...</>
                : 'Add Document'
              }
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Add Reminder Modal ─────────────────────────── */}
      <Modal isOpen={showReminder} onClose={() => setShowReminder(false)} title="Set Maintenance Reminder" size="sm">
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Reminder Type</label>
            <select value={reminderForm.reminder_type}
              onChange={(e) => setReminderForm({ ...reminderForm, reminder_type: e.target.value })}
              className={inputClass}>
              {REMINDER_TYPES.map(t => (
                <option key={t} value={t} className="bg-slate-800">{t}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Due Date (optional)</label>
            <input type="date" value={reminderForm.due_date}
              onChange={(e) => setReminderForm({ ...reminderForm, due_date: e.target.value })}
              className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Due Mileage in km (optional)</label>
            <input type="number" placeholder="e.g. 80000"
              value={reminderForm.due_mileage}
              onChange={(e) => setReminderForm({ ...reminderForm, due_mileage: e.target.value })}
              className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Notes (optional)</label>
            <textarea rows={2} placeholder="Any notes..."
              value={reminderForm.notes}
              onChange={(e) => setReminderForm({ ...reminderForm, notes: e.target.value })}
              className={`${inputClass} resize-none`} />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowReminder(false)}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                rounded-xl py-2.5 text-sm border border-white/20 transition-all">
              Cancel
            </button>
            <button onClick={() => addReminderMutation.mutate(reminderForm)}
              disabled={addReminderMutation.isPending}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold
                rounded-xl py-2.5 text-sm transition-all disabled:opacity-50
                flex items-center justify-center gap-2">
              {addReminderMutation.isPending
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Setting...</>
                : <><Bell size={14} /> Set Reminder</>
              }
            </button>
          </div>
        </div>
      </Modal>

    </PageWrapper>
  );
};

export default VehicleProfile;