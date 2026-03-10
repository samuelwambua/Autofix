import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Calendar, Plus, Search, Eye,
  XCircle, Clock, User, Car,
  CheckCircle, RefreshCw, Wrench,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAllAppointmentsApi, createAppointmentApi,
  updateAppointmentStatusApi, cancelAppointmentApi,
  rescheduleAppointmentApi, assignMechanicApi,
} from '../../api/appointmentApi';
import { getAllClientsApi } from '../../api/clientApi';
import { getAllVehiclesApi } from '../../api/vehicleApi';
import { getMechanicsApi } from '../../api/staffApi';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';

// ─── Helpers ──────────────────────────────────────────────
const getStatusBadge = (status) => {
  const map = {
    pending:   { variant: 'warning', label: 'Pending' },
    confirmed: { variant: 'success', label: 'Confirmed' },
    cancelled: { variant: 'danger',  label: 'Cancelled' },
    completed: { variant: 'info',    label: 'Completed' },
  };
  return map[status] || { variant: 'neutral', label: status };
};

const SERVICE_TYPES = [
  'Oil Change', 'Tire Rotation', 'Brake Service', 'Engine Diagnostic',
  'Transmission Service', 'AC Service', 'Battery Replacement',
  'Wheel Alignment', 'Suspension Repair', 'General Service', 'Other',
];

// ─── Schema ───────────────────────────────────────────────
const createSchema = z.object({
  client_id:        z.string().min(1, 'Please select a client.'),
  vehicle_id:       z.string().min(1, 'Please select a vehicle.'),
  service_type:     z.string().min(1, 'Please select a service type.'),
  appointment_date: z.string().min(1, 'Please select a date and time.'),
  notes:            z.string().optional(),
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

const AppointmentManagement = () => {
  const queryClient = useQueryClient();
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate]     = useState(false);
  const [viewAppt, setViewAppt]         = useState(null);
  const [rescheduleAppt, setRescheduleAppt] = useState(null);
  const [assignAppt, setAssignAppt]     = useState(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [newDate, setNewDate]           = useState('');
  const [selectedMechanic, setSelectedMechanic] = useState('');

  // ─── Queries ──────────────────────────────────────────
  const { data, isLoading } = useQuery({ queryKey: ['appointments'], queryFn: getAllAppointmentsApi });
  const { data: clientsData } = useQuery({ queryKey: ['clients'], queryFn: getAllClientsApi });
  const { data: vehiclesData } = useQuery({ queryKey: ['vehicles'], queryFn: getAllVehiclesApi });
  const { data: mechanicsData } = useQuery({ queryKey: ['mechanics'], queryFn: getMechanicsApi });

  // ─── Mutations ────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createAppointmentApi,
    onSuccess: () => {
      toast.success('Appointment created successfully.');
      queryClient.invalidateQueries(['appointments']);
      setShowCreate(false); reset();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create appointment.'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateAppointmentStatusApi(id, { status }),
    onSuccess: () => {
      toast.success('Status updated successfully.');
      queryClient.invalidateQueries(['appointments']);
      setViewAppt(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update status.'),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelAppointmentApi,
    onSuccess: () => {
      toast.success('Appointment cancelled.');
      queryClient.invalidateQueries(['appointments']);
      setViewAppt(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to cancel appointment.'),
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, date }) => rescheduleAppointmentApi(id, { appointment_date: date }),
    onSuccess: () => {
      toast.success('Appointment rescheduled.');
      queryClient.invalidateQueries(['appointments']);
      setRescheduleAppt(null); setNewDate('');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to reschedule.'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, mechanic_id }) => assignMechanicApi(id, { mechanic_id }),
    onSuccess: () => {
      toast.success('Mechanic assigned successfully.');
      queryClient.invalidateQueries(['appointments']);
      setAssignAppt(null); setSelectedMechanic('');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to assign mechanic.'),
  });

  // ─── Form ─────────────────────────────────────────────
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(createSchema),
  });

  const watchedClientId = watch('client_id');

  const onSubmit = (data) => createMutation.mutate(data);

  // ─── Filter data ──────────────────────────────────────
  const appointments = data?.data || [];
  const clients      = clientsData?.data || [];
  const vehicles     = vehiclesData?.data || [];
  const mechanics    = mechanicsData?.data || [];

  // Filter vehicles by selected client in form
  const clientVehicles = vehicles.filter((v) => v.client_id === watchedClientId);

  const filtered = appointments.filter((a) => {
    const matchSearch =
      `${a.client_name} ${a.vehicle_name} ${a.plate_number} ${a.service_type}`
        .toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <PageWrapper title="Appointments" subtitle="Manage all garage appointments.">

      {/* ── Top Bar ────────────────────────────────────── */}
      <GlassCard className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search appointments..."
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
              <option value="all"      className="bg-slate-800">All Statuses</option>
              <option value="pending"  className="bg-slate-800">Pending</option>
              <option value="confirmed"className="bg-slate-800">Confirmed</option>
              <option value="completed"className="bg-slate-800">Completed</option>
              <option value="cancelled"className="bg-slate-800">Cancelled</option>
            </select>
          </div>
          <button
            onClick={() => { setShowCreate(true); reset(); }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500
              hover:from-blue-600 hover:to-indigo-600 text-white font-semibold
              rounded-xl px-4 py-2 text-sm shadow-lg shadow-blue-500/30
              transition-all duration-200 whitespace-nowrap"
          >
            <Plus size={16} /> New Appointment
          </button>
        </div>
      </GlassCard>

      {/* ── Appointments Table ──────────────────────────── */}
      <GlassCard className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="md" text="Loading appointments..." />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Calendar size={36} className="text-white/20" />
            <p className="text-white/40 text-sm">No appointments found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {['Client', 'Vehicle', 'Service', 'Date & Time', 'Mechanic', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-white/50 text-xs font-semibold
                      uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((a) => {
                  const badge = getStatusBadge(a.status);
                  return (
                    <tr key={a.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-white text-sm font-medium">{a.client_name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white/70 text-sm">{a.vehicle_name}</p>
                        <p className="text-white/40 text-xs font-mono">{a.plate_number}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white/70 text-sm">{a.service_type}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white/70 text-sm">
                          {new Date(a.appointment_date).toLocaleDateString('en-KE', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </p>
                        <p className="text-white/40 text-xs">
                          {new Date(a.appointment_date).toLocaleTimeString('en-KE', {
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white/60 text-sm">{a.mechanic_name || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge label={badge.label} variant={badge.variant} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setViewAppt(a)}
                            className="p-1.5 rounded-lg text-white/40 hover:text-blue-400
                              hover:bg-blue-500/10 transition-all" title="View">
                            <Eye size={15} />
                          </button>
                          {a.status !== 'cancelled' && a.status !== 'completed' && (
                            <>
                              <button onClick={() => setRescheduleAppt(a)}
                                className="p-1.5 rounded-lg text-white/40 hover:text-amber-400
                                  hover:bg-amber-500/10 transition-all" title="Reschedule">
                                <RefreshCw size={15} />
                              </button>
                              <button onClick={() => { setAssignAppt(a); setSelectedMechanic(a.mechanic_id || ''); }}
                                className="p-1.5 rounded-lg text-white/40 hover:text-emerald-400
                                  hover:bg-emerald-500/10 transition-all" title="Assign Mechanic">
                                <Wrench size={15} />
                              </button>
                              <button onClick={() => cancelMutation.mutate(a.id)}
                                className="p-1.5 rounded-lg text-white/40 hover:text-red-400
                                  hover:bg-red-500/10 transition-all" title="Cancel">
                                <XCircle size={15} />
                              </button>
                            </>
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

      {/* ── Create Appointment Modal ────────────────────── */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); reset(); }} title="New Appointment" size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Client" error={errors.client_id?.message}>
            <select {...register('client_id')} className={inputClass(!!errors.client_id)}>
              <option value="" className="bg-slate-800">Select client...</option>
              {clients.filter(c => c.is_active).map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-800">
                  {c.first_name} {c.last_name} — {c.phone}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Vehicle" error={errors.vehicle_id?.message}>
            <select {...register('vehicle_id')} className={inputClass(!!errors.vehicle_id)} disabled={!watchedClientId}>
              <option value="" className="bg-slate-800">
                {watchedClientId ? 'Select vehicle...' : 'Select a client first'}
              </option>
              {clientVehicles.map((v) => (
                <option key={v.id} value={v.id} className="bg-slate-800">
                  {v.make} {v.model} — {v.plate_number}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Service Type" error={errors.service_type?.message}>
            <select {...register('service_type')} className={inputClass(!!errors.service_type)}>
              <option value="" className="bg-slate-800">Select service...</option>
              {SERVICE_TYPES.map((s) => (
                <option key={s} value={s} className="bg-slate-800">{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Date & Time" error={errors.appointment_date?.message}>
            <input
              type="datetime-local"
              {...register('appointment_date')}
              min={new Date().toISOString().slice(0, 16)}
              className={inputClass(!!errors.appointment_date)}
            />
          </Field>
          <Field label="Notes (optional)" error={errors.notes?.message}>
            <textarea
              rows={3}
              placeholder="Any special instructions or notes..."
              {...register('notes')}
              className={`${inputClass(false)} resize-none`}
            />
          </Field>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowCreate(false); reset(); }}
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
                : 'Create Appointment'
              }
            </button>
          </div>
        </form>
      </Modal>

      {/* ── View Appointment Modal ──────────────────────── */}
      {viewAppt && (
        <Modal isOpen={!!viewAppt} onClose={() => setViewAppt(null)} title="Appointment Details" size="sm">
          <div className="space-y-3">
            {[
              { icon: User,     label: 'Client',   value: viewAppt.client_name },
              { icon: Car,      label: 'Vehicle',  value: `${viewAppt.vehicle_name} (${viewAppt.plate_number})` },
              { icon: Wrench,   label: 'Service',  value: viewAppt.service_type },
              { icon: Calendar, label: 'Date',     value: new Date(viewAppt.appointment_date).toLocaleString('en-KE') },
              { icon: User,     label: 'Mechanic', value: viewAppt.mechanic_name || 'Not assigned' },
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
            {viewAppt.notes && (
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/40 text-xs mb-1">Notes</p>
                <p className="text-white text-sm">{viewAppt.notes}</p>
              </div>
            )}
            {/* Status actions */}
            {viewAppt.status === 'pending' && (
              <button
                onClick={() => statusMutation.mutate({ id: viewAppt.id, status: 'confirmed' })}
                disabled={statusMutation.isPending}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500
                  text-white font-semibold rounded-xl py-2.5 text-sm
                  flex items-center justify-center gap-2 transition-all
                  disabled:opacity-50"
              >
                <CheckCircle size={15} /> Confirm Appointment
              </button>
            )}
            {viewAppt.status === 'confirmed' && (
              <button
                onClick={() => statusMutation.mutate({ id: viewAppt.id, status: 'completed' })}
                disabled={statusMutation.isPending}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500
                  text-white font-semibold rounded-xl py-2.5 text-sm
                  flex items-center justify-center gap-2 transition-all
                  disabled:opacity-50"
              >
                <CheckCircle size={15} /> Mark as Completed
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* ── Reschedule Modal ────────────────────────────── */}
      {rescheduleAppt && (
        <Modal isOpen={!!rescheduleAppt} onClose={() => { setRescheduleAppt(null); setNewDate(''); }} title="Reschedule Appointment" size="sm">
          <div className="space-y-4">
            <p className="text-white/60 text-sm">
              Current: <span className="text-white">{new Date(rescheduleAppt.appointment_date).toLocaleString('en-KE')}</span>
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-white/70 text-sm font-medium">New Date & Time</label>
              <input
                type="datetime-local"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className={inputClass(false)}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setRescheduleAppt(null); setNewDate(''); }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                  rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                Cancel
              </button>
              <button
                onClick={() => rescheduleMutation.mutate({ id: rescheduleAppt.id, date: newDate })}
                disabled={!newDate || rescheduleMutation.isPending}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500
                  text-white font-semibold rounded-xl py-2.5 text-sm
                  transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {rescheduleMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                  : 'Reschedule'
                }
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Assign Mechanic Modal ───────────────────────── */}
      {assignAppt && (
        <Modal isOpen={!!assignAppt} onClose={() => { setAssignAppt(null); setSelectedMechanic(''); }} title="Assign Mechanic" size="sm">
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-white/70 text-sm font-medium">Select Mechanic</label>
              <select
                value={selectedMechanic}
                onChange={(e) => setSelectedMechanic(e.target.value)}
                className={inputClass(false)}
              >
                <option value="" className="bg-slate-800">Select mechanic...</option>
                {mechanics.map((m) => (
                  <option key={m.id} value={m.id} className="bg-slate-800">
                    {m.first_name} {m.last_name}
                    {m.specialization ? ` — ${m.specialization}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setAssignAppt(null); setSelectedMechanic(''); }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                  rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                Cancel
              </button>
              <button
                onClick={() => assignMutation.mutate({ id: assignAppt.id, mechanic_id: selectedMechanic })}
                disabled={!selectedMechanic || assignMutation.isPending}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500
                  text-white font-semibold rounded-xl py-2.5 text-sm
                  transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {assignMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Assigning...</>
                  : 'Assign'
                }
              </button>
            </div>
          </div>
        </Modal>
      )}

    </PageWrapper>
  );
};

export default AppointmentManagement;