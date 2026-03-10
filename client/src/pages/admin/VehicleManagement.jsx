import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Car, Plus, Search, Eye, Trash2,
  Edit2, Calendar, User, Hash,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getAllVehiclesApi, createVehicleApi, updateVehicleApi, deleteVehicleApi } from '../../api/vehicleApi';
import { getAllClientsApi } from '../../api/clientApi';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';

// ─── Schema ───────────────────────────────────────────────
const vehicleSchema = z.object({
  client_id:    z.string().min(1, 'Please select a client.'),
  make:         z.string().min(1, 'Make is required.').max(50),
  model:        z.string().min(1, 'Model is required.').max(50),
  year:         z.coerce.number()
                  .min(1900, 'Year must be 1900 or later.')
                  .max(new Date().getFullYear() + 1, 'Year cannot be in the future.'),
  plate_number: z.string().min(1, 'Plate number is required.')
                  .max(20)
                  .regex(/^[A-Z0-9\s]+$/i, 'Plate number can only contain letters, numbers and spaces.'),
  color:        z.string().max(30).optional(),
  vin:          z.string().max(17).optional(),
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

const VehicleManagement = () => {
  const queryClient = useQueryClient();
  const [search, setSearch]           = useState('');
  const [showForm, setShowForm]       = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [viewVehicle, setViewVehicle] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // ─── Queries ──────────────────────────────────────────
  const { data, isLoading } = useQuery({ queryKey: ['vehicles'], queryFn: getAllVehiclesApi });
  const { data: clientsData } = useQuery({ queryKey: ['clients'], queryFn: getAllClientsApi });

  // ─── Mutations ────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createVehicleApi,
    onSuccess: () => {
      toast.success('Vehicle added successfully.');
      queryClient.invalidateQueries(['vehicles']);
      setShowForm(false); reset();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add vehicle.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateVehicleApi(id, data),
    onSuccess: () => {
      toast.success('Vehicle updated successfully.');
      queryClient.invalidateQueries(['vehicles']);
      setEditVehicle(null); reset();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update vehicle.'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVehicleApi,
    onSuccess: () => {
      toast.success('Vehicle deleted successfully.');
      queryClient.invalidateQueries(['vehicles']);
      setConfirmDelete(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete vehicle.'),
  });

  // ─── Form ─────────────────────────────────────────────
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(vehicleSchema),
  });

  const openEdit = (vehicle) => {
    setEditVehicle(vehicle);
    reset({
      client_id:    vehicle.client_id,
      make:         vehicle.make,
      model:        vehicle.model,
      year:         vehicle.year,
      plate_number: vehicle.plate_number,
      color:        vehicle.color || '',
      vin:          vehicle.vin || '',
    });
  };

  const onSubmit = (data) => {
    if (editVehicle) {
      updateMutation.mutate({ id: editVehicle.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // ─── Filter ───────────────────────────────────────────
  const vehicles = data?.data || [];
  const clients  = clientsData?.data || [];
  const filtered = vehicles.filter((v) =>
    `${v.make} ${v.model} ${v.plate_number} ${v.owner_name}`
      .toLowerCase().includes(search.toLowerCase())
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <PageWrapper title="Vehicle Management" subtitle="Manage all registered vehicles.">

      {/* ── Top Bar ────────────────────────────────────── */}
      <GlassCard className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search vehicles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl
                pl-9 pr-4 py-2 text-white placeholder-white/30 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <button
            onClick={() => { setShowForm(true); setEditVehicle(null); reset(); }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500
              hover:from-blue-600 hover:to-indigo-600 text-white font-semibold
              rounded-xl px-4 py-2 text-sm shadow-lg shadow-blue-500/30
              transition-all duration-200 whitespace-nowrap"
          >
            <Plus size={16} /> Add Vehicle
          </button>
        </div>
      </GlassCard>

      {/* ── Vehicles Table ──────────────────────────────── */}
      <GlassCard className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="md" text="Loading vehicles..." />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Car size={36} className="text-white/20" />
            <p className="text-white/40 text-sm">No vehicles found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {['Vehicle', 'Plate Number', 'Year', 'Color', 'Owner', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-white/50 text-xs font-semibold
                      uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-white/5 transition-colors">
                    {/* Vehicle */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/20
                          flex items-center justify-center flex-shrink-0">
                          <Car size={15} className="text-cyan-400" />
                        </div>
                        <p className="text-white text-sm font-medium">
                          {v.make} {v.model}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-white/10 border border-white/20 rounded-lg
                        px-2.5 py-1 text-white text-xs font-mono">
                        {v.plate_number}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white/60 text-sm">{v.year}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white/60 text-sm">{v.color || '—'}</p>
                    </td>
                    {/* Owner */}
                    <td className="px-4 py-3">
                      <p className="text-white/70 text-sm">{v.owner_name || '—'}</p>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setViewVehicle(v)}
                          className="p-1.5 rounded-lg text-white/40 hover:text-blue-400
                            hover:bg-blue-500/10 transition-all" title="View">
                          <Eye size={15} />
                        </button>
                        <button onClick={() => openEdit(v)}
                          className="p-1.5 rounded-lg text-white/40 hover:text-amber-400
                            hover:bg-amber-500/10 transition-all" title="Edit">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => setConfirmDelete(v)}
                          className="p-1.5 rounded-lg text-white/40 hover:text-red-400
                            hover:bg-red-500/10 transition-all" title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* ── Add / Edit Vehicle Modal ────────────────────── */}
      <Modal
        isOpen={showForm || !!editVehicle}
        onClose={() => { setShowForm(false); setEditVehicle(null); reset(); }}
        title={editVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Owner (Client)" error={errors.client_id?.message}>
            <select {...register('client_id')} className={inputClass(!!errors.client_id)}>
              <option value="" className="bg-slate-800">Select client...</option>
              {clients.filter(c => c.is_active).map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-800">
                  {c.first_name} {c.last_name} — {c.phone}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Make" error={errors.make?.message}>
              <input type="text" placeholder="e.g. Toyota" {...register('make')} className={inputClass(!!errors.make)} />
            </Field>
            <Field label="Model" error={errors.model?.message}>
              <input type="text" placeholder="e.g. Corolla" {...register('model')} className={inputClass(!!errors.model)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Year" error={errors.year?.message}>
              <input type="number" placeholder="e.g. 2020" {...register('year')} className={inputClass(!!errors.year)} />
            </Field>
            <Field label="Color" error={errors.color?.message}>
              <input type="text" placeholder="e.g. Silver" {...register('color')} className={inputClass(!!errors.color)} />
            </Field>
          </div>
          <Field label="Plate Number" error={errors.plate_number?.message}>
            <input type="text" placeholder="e.g. KDA 123A" {...register('plate_number')}
              className={inputClass(!!errors.plate_number)}
              style={{ textTransform: 'uppercase' }}
            />
          </Field>
          <Field label="VIN (optional)" error={errors.vin?.message}>
            <input type="text" placeholder="Vehicle Identification Number" {...register('vin')} className={inputClass(!!errors.vin)} />
          </Field>
          <div className="flex gap-3 pt-2">
            <button type="button"
              onClick={() => { setShowForm(false); setEditVehicle(null); reset(); }}
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
                : editVehicle ? 'Update Vehicle' : 'Add Vehicle'
              }
            </button>
          </div>
        </form>
      </Modal>

      {/* ── View Vehicle Modal ──────────────────────────── */}
      {viewVehicle && (
        <Modal isOpen={!!viewVehicle} onClose={() => setViewVehicle(null)} title="Vehicle Details" size="sm">
          <div className="space-y-3">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/30
                flex items-center justify-center">
                <Car size={24} className="text-cyan-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">
                  {viewVehicle.make} {viewVehicle.model}
                </h3>
                <span className="bg-white/10 border border-white/20 rounded-lg
                  px-2.5 py-0.5 text-white text-xs font-mono">
                  {viewVehicle.plate_number}
                </span>
              </div>
            </div>
            {[
              { icon: Calendar, label: 'Year',  value: viewVehicle.year },
              { icon: Hash,     label: 'Color', value: viewVehicle.color || 'N/A' },
              { icon: Hash,     label: 'VIN',   value: viewVehicle.vin || 'N/A' },
              { icon: User,     label: 'Owner', value: viewVehicle.owner_name || 'N/A' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 p-3
                bg-white/5 rounded-xl border border-white/10">
                <Icon size={15} className="text-white/40 flex-shrink-0" />
                <div>
                  <p className="text-white/40 text-xs">{label}</p>
                  <p className="text-white text-sm">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* ── Confirm Delete Modal ────────────────────────── */}
      {confirmDelete && (
        <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Vehicle" size="sm">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30
              flex items-center justify-center mx-auto">
              <Trash2 size={24} className="text-red-400" />
            </div>
            <div>
              <p className="text-white font-medium">Delete this vehicle?</p>
              <p className="text-white/50 text-sm mt-1">
                <span className="text-white font-semibold">
                  {confirmDelete.make} {confirmDelete.model} — {confirmDelete.plate_number}
                </span>{' '}
                will be permanently removed.
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
                  hover:from-red-600 hover:to-rose-600 text-white font-semibold
                  rounded-xl py-2.5 text-sm shadow-lg shadow-red-500/30
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

export default VehicleManagement;