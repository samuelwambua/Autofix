import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Car, Eye, Calendar, ChevronRight, Bell, FileText,
  Wrench, Plus, Trash2, Edit, AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';

const fetchMyVehicles = () => axiosInstance.get('/vehicles-enhanced/my-vehicles').then(r => r.data);

const schema = z.object({
  make:         z.string().min(1, 'Make is required'),
  model:        z.string().min(1, 'Model is required'),
  year:         z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
  plate_number: z.string().min(1, 'Plate number is required'),
  color:        z.string().optional(),
  mileage:      z.coerce.number().min(0).optional(),
  engine_size:  z.string().optional(),
  fuel_type:    z.string().optional(),
  transmission: z.string().optional(),
  vin_number:   z.string().optional(),
  purchase_date:    z.string().optional(),
  insurance_expiry: z.string().optional(),
  notes:        z.string().optional(),
});

const inputClass = 'w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all';
const labelClass = 'text-white/60 text-xs font-medium mb-1 block';

const FUEL_TYPES     = ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'LPG'];
const TRANSMISSIONS  = ['Automatic', 'Manual', 'CVT', 'Semi-Automatic'];

const MyVehicles = () => {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const [viewVehicle, setViewVehicle]     = useState(null);
  const [showForm, setShowForm]           = useState(false);
  const [editVehicle, setEditVehicle]     = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['myVehiclesEnhanced'],
    queryFn: fetchMyVehicles,
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  // ── Add Vehicle ──────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: (data) => axiosInstance.post('/vehicles', data).then(r => r.data),
    onSuccess: (d) => {
      toast.success('Vehicle added successfully!');
      queryClient.invalidateQueries(['myVehiclesEnhanced']);
      setShowForm(false);
      reset();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add vehicle.'),
  });

  // ── Update Vehicle ───────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) =>
      axiosInstance.put(`/vehicles-enhanced/${id}/enhanced`, data).then(r => r.data),
    onSuccess: (d) => {
      toast.success('Vehicle updated successfully!');
      queryClient.invalidateQueries(['myVehiclesEnhanced']);
      setEditVehicle(null);
      reset();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update vehicle.'),
  });

  // ── Delete Vehicle ───────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/vehicles/${id}`).then(r => r.data),
    onSuccess: (d) => {
      toast.success(d.message);
      queryClient.invalidateQueries(['myVehiclesEnhanced']);
      setConfirmDelete(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete vehicle.'),
  });

  const openEdit = (v) => {
    setEditVehicle(v);
    // Pre-fill form
    Object.keys(v).forEach(key => setValue(key, v[key] || ''));
  };

  const onSubmit = (data) => {
    if (editVehicle) {
      updateMutation.mutate({ id: editVehicle.id, data });
    } else {
      addMutation.mutate(data);
    }
  };

  const vehicles = data?.data || [];

  const VehicleForm = ({ title, onClose }) => (
    <Modal isOpen={true} onClose={onClose} title={title} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Basic Info */}
        <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">Basic Info</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Make *</label>
            <input placeholder="Toyota" {...register('make')} className={inputClass} />
            {errors.make && <p className="text-red-400 text-xs mt-1">{errors.make.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Model *</label>
            <input placeholder="Corolla" {...register('model')} className={inputClass} />
            {errors.model && <p className="text-red-400 text-xs mt-1">{errors.model.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Year *</label>
            <input type="number" placeholder="2020" {...register('year')} className={inputClass} />
            {errors.year && <p className="text-red-400 text-xs mt-1">{errors.year.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Plate Number *</label>
            <input placeholder="KDA 123A" {...register('plate_number')} className={inputClass} />
            {errors.plate_number && <p className="text-red-400 text-xs mt-1">{errors.plate_number.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Color</label>
            <input placeholder="Silver" {...register('color')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Current Mileage (km)</label>
            <input type="number" placeholder="50000" {...register('mileage')} className={inputClass} />
          </div>
        </div>

        {/* Technical Details */}
        <p className="text-white/50 text-xs font-semibold uppercase tracking-wider pt-1">Technical Details</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Engine Size</label>
            <input placeholder="1800cc" {...register('engine_size')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Fuel Type</label>
            <select {...register('fuel_type')} className={inputClass}>
              <option value="" className="bg-slate-800">Select fuel type</option>
              {FUEL_TYPES.map(f => <option key={f} value={f} className="bg-slate-800">{f}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Transmission</label>
            <select {...register('transmission')} className={inputClass}>
              <option value="" className="bg-slate-800">Select transmission</option>
              {TRANSMISSIONS.map(t => <option key={t} value={t} className="bg-slate-800">{t}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>VIN Number</label>
            <input placeholder="JT2BF22K..." {...register('vin_number')} className={inputClass} />
          </div>
        </div>

        {/* Dates */}
        <p className="text-white/50 text-xs font-semibold uppercase tracking-wider pt-1">Dates & Documents</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Purchase Date</label>
            <input type="date" {...register('purchase_date')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Insurance Expiry</label>
            <input type="date" {...register('insurance_expiry')} className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Notes</label>
          <textarea rows={2} placeholder="Any additional notes..."
            {...register('notes')} className={`${inputClass} resize-none`} />
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
              rounded-xl py-2.5 text-sm border border-white/20 transition-all">
            Cancel
          </button>
          <button type="submit"
            disabled={addMutation.isPending || updateMutation.isPending}
            className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500
              hover:from-blue-600 hover:to-indigo-600 text-white font-semibold
              rounded-xl py-2.5 text-sm transition-all disabled:opacity-50
              flex items-center justify-center gap-2">
            {(addMutation.isPending || updateMutation.isPending)
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {editVehicle ? 'Updating...' : 'Adding...'}
                </>
              : editVehicle ? <><Edit size={14} /> Update Vehicle</> : <><Plus size={14} /> Add Vehicle</>
            }
          </button>
        </div>
      </form>
    </Modal>
  );

  return (
    <PageWrapper title="My Vehicles" subtitle="Manage all vehicles registered under your account.">

      {/* ── Top Bar ────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-white/40 text-sm">
          {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} registered
        </p>
        <button
          onClick={() => { reset(); setEditVehicle(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500
            hover:from-blue-600 hover:to-indigo-600 text-white font-semibold
            rounded-xl px-4 py-2 text-sm shadow-lg shadow-blue-500/20 transition-all">
          <Plus size={15} /> Add Vehicle
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="md" text="Loading vehicles..." />
        </div>
      ) : vehicles.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-16 gap-3">
          <Car size={36} className="text-white/20" />
          <p className="text-white/40 text-sm">No vehicles registered yet.</p>
          <p className="text-white/25 text-xs">Add your first vehicle to get started.</p>
          <button
            onClick={() => { reset(); setEditVehicle(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30
              text-blue-300 text-xs font-semibold rounded-xl px-4 py-2
              border border-blue-500/30 transition-all mt-2">
            <Plus size={13} /> Add Your First Vehicle
          </button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {vehicles.map((v) => {
            const insuranceDays = v.insurance_expiry
              ? Math.ceil((new Date(v.insurance_expiry) - new Date()) / (1000 * 60 * 60 * 24))
              : null;
            const insuranceWarning = insuranceDays !== null && insuranceDays <= 30;

            return (
              <GlassCard key={v.id} className={`p-5 ${insuranceWarning ? 'border border-amber-500/30' : ''}`}>

                {/* Insurance warning */}
                {insuranceWarning && (
                  <div className="mb-3 px-3 py-2 bg-amber-500/15 rounded-xl border border-amber-500/20
                    flex items-center gap-2">
                    <Bell size={12} className="text-amber-400 flex-shrink-0" />
                    <p className="text-amber-300 text-xs">
                      {insuranceDays <= 0
                        ? 'Insurance expired!'
                        : `Insurance expires in ${insuranceDays} day${insuranceDays !== 1 ? 's' : ''}`
                      }
                    </p>
                  </div>
                )}

                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-500/30
                      flex items-center justify-center flex-shrink-0">
                      <Car size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">{v.make} {v.model}</p>
                      <p className="text-white/40 text-xs font-mono">{v.plate_number}</p>
                    </div>
                  </div>
                  <span className="text-white/40 text-sm font-semibold">{v.year}</span>
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4">
                  {[
                    { label: 'Color',   value: v.color || '—' },
                    { label: 'Mileage', value: `${parseInt(v.mileage || 0).toLocaleString()} km` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between
                      text-sm px-3 py-2 bg-white/5 rounded-xl border border-white/10">
                      <span className="text-white/40">{label}</span>
                      <span className="text-white font-medium">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { icon: Wrench,   label: 'Jobs',      value: v.total_jobs        || 0 },
                    { icon: FileText, label: 'Docs',      value: v.document_count    || 0 },
                    { icon: Bell,     label: 'Reminders', value: v.pending_reminders || 0,
                      highlight: parseInt(v.pending_reminders || 0) > 0 },
                  ].map(({ icon: Icon, label, value, highlight }) => (
                    <div key={label} className={`flex flex-col items-center p-2 rounded-xl border text-center
                      ${highlight ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white/5 border-white/10'}`}>
                      <Icon size={12} className={`mb-0.5 ${highlight ? 'text-amber-400' : 'text-white/30'}`} />
                      <p className={`font-bold text-sm ${highlight ? 'text-amber-300' : 'text-white'}`}>{value}</p>
                      <p className="text-white/30 text-xs">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => setViewVehicle(v)}
                    className="p-2 rounded-xl text-white/40 hover:text-white
                      hover:bg-white/10 border border-white/10 transition-all" title="Quick view">
                    <Eye size={15} />
                  </button>
                  <button onClick={() => { openEdit(v); }}
                    className="p-2 rounded-xl text-white/40 hover:text-blue-400
                      hover:bg-blue-500/10 border border-white/10 transition-all" title="Edit vehicle">
                    <Edit size={15} />
                  </button>
                  <button
                    onClick={() => navigate(`/client/vehicles/${v.id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5
                      bg-gradient-to-r from-blue-500 to-indigo-500
                      hover:from-blue-600 hover:to-indigo-600
                      text-white text-xs font-semibold rounded-xl py-2
                      shadow-lg shadow-blue-500/20 transition-all">
                    Full Profile <ChevronRight size={13} />
                  </button>
                  <button onClick={() => navigate('/client/appointments')}
                    className="p-2 rounded-xl text-blue-400/60 hover:text-blue-300
                      hover:bg-blue-500/10 border border-white/10 transition-all" title="Book service">
                    <Calendar size={15} />
                  </button>
                  <button onClick={() => setConfirmDelete(v)}
                    className="p-2 rounded-xl text-red-400/40 hover:text-red-400
                      hover:bg-red-500/10 border border-white/10 transition-all" title="Delete vehicle">
                    <Trash2 size={15} />
                  </button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* ── Add Vehicle Form ─────────────────────────────── */}
      {showForm && (
        <VehicleForm
          title="Add New Vehicle"
          onClose={() => { setShowForm(false); reset(); }}
        />
      )}

      {/* ── Edit Vehicle Form ────────────────────────────── */}
      {editVehicle && (
        <VehicleForm
          title="Edit Vehicle"
          onClose={() => { setEditVehicle(null); reset(); }}
        />
      )}

      {/* ── Quick View Modal ─────────────────────────────── */}
      {viewVehicle && (
        <Modal isOpen={!!viewVehicle} onClose={() => setViewVehicle(null)} title="Vehicle Details" size="sm">
          <div className="space-y-3">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30
                flex items-center justify-center">
                <Car size={22} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-bold">{viewVehicle.make} {viewVehicle.model}</h3>
                <span className="font-mono text-white/40 text-xs">{viewVehicle.plate_number}</span>
              </div>
            </div>

            {[
              { label: 'Year',         value: viewVehicle.year },
              { label: 'Color',        value: viewVehicle.color || '—' },
              { label: 'Mileage',      value: `${parseInt(viewVehicle.mileage || 0).toLocaleString()} km` },
              { label: 'Fuel Type',    value: viewVehicle.fuel_type || '—' },
              { label: 'Transmission', value: viewVehicle.transmission || '—' },
              { label: 'Engine',       value: viewVehicle.engine_size || '—' },
              { label: 'Jobs Done',    value: viewVehicle.total_jobs || 0 },
              { label: 'Registered',   value: new Date(viewVehicle.created_at).toLocaleDateString('en-KE') },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between p-3
                bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/40 text-sm">{label}</p>
                <p className="text-white text-sm font-medium capitalize">{value}</p>
              </div>
            ))}

            <div className="flex gap-2 pt-1">
              <button onClick={() => { setViewVehicle(null); openEdit(viewVehicle); }}
                className="flex-1 flex items-center justify-center gap-1.5
                  bg-white/10 hover:bg-white/20 text-white font-semibold
                  rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                <Edit size={14} /> Edit
              </button>
              <button
                onClick={() => { setViewVehicle(null); navigate(`/client/vehicles/${viewVehicle.id}`); }}
                className="flex-1 flex items-center justify-center gap-1.5
                  bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold
                  rounded-xl py-2.5 text-sm transition-all">
                Full Profile <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Confirm Delete Modal ─────────────────────────── */}
      {confirmDelete && (
        <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Vehicle" size="sm">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30
              flex items-center justify-center mx-auto">
              <AlertTriangle size={24} className="text-red-400" />
            </div>
            <div>
              <p className="text-white font-semibold">
                Delete {confirmDelete.make} {confirmDelete.model}?
              </p>
              <p className="text-white/40 text-sm mt-1">{confirmDelete.plate_number}</p>
              <p className="text-red-400/70 text-xs mt-2">
                This will permanently delete the vehicle and all its documents, reminders and service history.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                  rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(confirmDelete.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-gradient-to-r from-red-500 to-rose-500
                  text-white font-semibold rounded-xl py-2.5 text-sm
                  transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {deleteMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deleting...</>
                  : <><Trash2 size={14} /> Delete Vehicle</>
                }
              </button>
            </div>
          </div>
        </Modal>
      )}

    </PageWrapper>
  );
};

export default MyVehicles;