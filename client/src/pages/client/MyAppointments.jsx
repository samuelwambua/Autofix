import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, Plus, Search, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';

const fetchMyAppointments = async () => {
  const res = await axiosInstance.get('/appointments/my-appointments');
  return res.data;
};
const fetchMyVehicles = async () => {
  const res = await axiosInstance.get('/vehicles/my-vehicles');
  return res.data;
};
const createAppointment = async (data) => {
  const res = await axiosInstance.post('/appointments', data);
  return res.data;
};
const cancelAppointment = async (id) => {
  const res = await axiosInstance.put(`/appointments/${id}/cancel`);
  return res.data;
};

const SERVICE_TYPES = [
  'Oil Change', 'Tyre Rotation', 'Brake Service', 'Engine Tune-Up',
  'Full Engine Diagnosis', 'Wheel Alignment', 'AC Service',
  'Electrical Repair', 'Body Work', 'Other',
];

const getApptBadge = (status) => {
  const map = {
    pending:   { variant: 'warning', label: 'Pending' },
    confirmed: { variant: 'info',    label: 'Confirmed' },
    completed: { variant: 'success', label: 'Completed' },
    cancelled: { variant: 'danger',  label: 'Cancelled' },
  };
  return map[status] || { variant: 'neutral', label: status };
};

const bookingSchema = z.object({
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

const MyAppointments = () => {
  const queryClient = useQueryClient();
  const [search, setSearch]           = useState('');
  const [showBook, setShowBook]       = useState(false);
  const [viewAppt, setViewAppt]       = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['myAppointments'], queryFn: fetchMyAppointments });
  const { data: vehiclesData } = useQuery({ queryKey: ['myVehicles'], queryFn: fetchMyVehicles });

  const bookMutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      toast.success('Appointment booked successfully.');
      queryClient.invalidateQueries(['myAppointments', 'clientDashboard']);
      setShowBook(false); reset();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to book appointment.'),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelAppointment,
    onSuccess: () => {
      toast.success('Appointment cancelled.');
      queryClient.invalidateQueries(['myAppointments', 'clientDashboard']);
      setConfirmCancel(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to cancel appointment.'),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(bookingSchema),
  });

  const onSubmit = (data) => bookMutation.mutate(data);

  const appointments = data?.data || [];
  const vehicles     = vehiclesData?.data || [];

  const filtered = appointments.filter((a) =>
    `${a.service_type} ${a.vehicle_name} ${a.plate_number}`
      .toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageWrapper title="My Appointments" subtitle="Book and manage your service appointments.">

      {/* ── Top Bar ────────────────────────────────────── */}
      <GlassCard className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text" placeholder="Search appointments..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl
                pl-9 pr-4 py-2 text-white placeholder-white/30 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <button
            onClick={() => { setShowBook(true); reset(); }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500
              hover:from-blue-600 hover:to-indigo-600 text-white font-semibold
              rounded-xl px-4 py-2 text-sm shadow-lg shadow-blue-500/30
              transition-all whitespace-nowrap"
          >
            <Plus size={16} /> Book Appointment
          </button>
        </div>
      </GlassCard>

      {/* ── Appointments List ────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="md" text="Loading appointments..." />
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-16 gap-3">
          <Calendar size={36} className="text-white/20" />
          <p className="text-white/40 text-sm">No appointments found.</p>
          <button
            onClick={() => { setShowBook(true); reset(); }}
            className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30
              text-blue-300 text-xs font-semibold rounded-xl px-4 py-2 transition-all"
          >
            <Plus size={13} /> Book your first appointment
          </button>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const badge     = getApptBadge(a.status);
            const canCancel = ['pending', 'confirmed'].includes(a.status);
            return (
              <GlassCard key={a.id} className="p-4 hover:bg-white/15 transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center
                    justify-center flex-shrink-0">
                    <Calendar size={16} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className="text-white font-semibold text-sm">{a.service_type}</p>
                      <Badge label={badge.label} variant={badge.variant} />
                    </div>
                    <p className="text-white/40 text-xs mt-1">
                      {a.vehicle_name} • {a.plate_number}
                    </p>
                    <p className="text-white/30 text-xs mt-0.5">
                      {new Date(a.appointment_date).toLocaleDateString('en-KE', {
                        weekday: 'long', year: 'numeric', month: 'long',
                        day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                    {a.mechanic_name && (
                      <p className="text-white/30 text-xs mt-0.5">
                        Mechanic: {a.mechanic_name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setViewAppt(a)}
                      className="p-2 rounded-xl text-white/40 hover:text-blue-400
                        hover:bg-blue-500/10 transition-all" title="View">
                      <Eye size={15} />
                    </button>
                    {canCancel && (
                      <button onClick={() => setConfirmCancel(a)}
                        className="p-2 rounded-xl text-white/40 hover:text-red-400
                          hover:bg-red-500/10 transition-all" title="Cancel">
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* ── Book Appointment Modal ───────────────────────── */}
      <Modal isOpen={showBook} onClose={() => { setShowBook(false); reset(); }} title="Book Appointment" size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Vehicle" error={errors.vehicle_id?.message}>
            <select {...register('vehicle_id')} className={inputClass(!!errors.vehicle_id)}>
              <option value="" className="bg-slate-800">Select vehicle...</option>
              {vehicles.map((v) => (
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
          <Field label="Preferred Date & Time" error={errors.appointment_date?.message}>
            <input
              type="datetime-local"
              {...register('appointment_date')}
              className={inputClass(!!errors.appointment_date)}
              style={{ colorScheme: 'dark' }}
            />
          </Field>
          <Field label="Notes (optional)" error={errors.notes?.message}>
            <textarea
              rows={2} placeholder="Any additional information..."
              {...register('notes')}
              className={`${inputClass(false)} resize-none`}
            />
          </Field>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowBook(false); reset(); }}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                rounded-xl py-2.5 text-sm border border-white/20 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={bookMutation.isPending}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500
                text-white font-semibold rounded-xl py-2.5 text-sm
                transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {bookMutation.isPending
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Booking...</>
                : 'Book Appointment'
              }
            </button>
          </div>
        </form>
      </Modal>

      {/* ── View Appointment Modal ───────────────────────── */}
      {viewAppt && (
        <Modal isOpen={!!viewAppt} onClose={() => setViewAppt(null)} title="Appointment Details" size="sm">
          <div className="space-y-3">
            {[
              { label: 'Service',   value: viewAppt.service_type },
              { label: 'Vehicle',   value: `${viewAppt.vehicle_name} (${viewAppt.plate_number})` },
              { label: 'Date',      value: new Date(viewAppt.appointment_date).toLocaleDateString('en-KE', {
                  weekday: 'long', year: 'numeric', month: 'long',
                  day: 'numeric', hour: '2-digit', minute: '2-digit',
                })},
              { label: 'Status',    value: viewAppt.status },
              { label: 'Mechanic',  value: viewAppt.mechanic_name || 'Not assigned yet' },
              { label: 'Notes',     value: viewAppt.notes || 'None' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start justify-between gap-3 p-3
                bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/40 text-sm flex-shrink-0">{label}</p>
                <p className="text-white text-sm text-right">{value}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* ── Confirm Cancel Modal ─────────────────────────── */}
      {confirmCancel && (
        <Modal isOpen={!!confirmCancel} onClose={() => setConfirmCancel(null)} title="Cancel Appointment" size="sm">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30
              flex items-center justify-center mx-auto">
              <X size={24} className="text-red-400" />
            </div>
            <div>
              <p className="text-white font-medium">Cancel this appointment?</p>
              <p className="text-white/50 text-sm mt-1">
                {confirmCancel.service_type} on{' '}
                {new Date(confirmCancel.appointment_date).toLocaleDateString('en-KE')}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmCancel(null)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                  rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                Keep It
              </button>
              <button onClick={() => cancelMutation.mutate(confirmCancel.id)}
                disabled={cancelMutation.isPending}
                className="flex-1 bg-gradient-to-r from-red-500 to-rose-500
                  text-white font-semibold rounded-xl py-2.5 text-sm
                  transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {cancelMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Cancelling...</>
                  : 'Cancel Appointment'
                }
              </button>
            </div>
          </div>
        </Modal>
      )}

    </PageWrapper>
  );
};

export default MyAppointments;