import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Search, Eye, X, Check, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';

// Supervisor sees only appointments where they were chosen by the client
const fetchMyAppointments = () =>
  axiosInstance.get('/appointments/supervisor/my').then(r => r.data);
const fetchMyTeam = () =>
  axiosInstance.get('/supervisor/team').then(r => r.data);

const getApptBadge = (status) => {
  const map = {
    pending:   { variant: 'warning', label: 'Pending' },
    confirmed: { variant: 'info',    label: 'Confirmed' },
    completed: { variant: 'success', label: 'Completed' },
    cancelled: { variant: 'danger',  label: 'Cancelled' },
  };
  return map[status] || { variant: 'neutral', label: status };
};

const SupervisorAppointments = () => {
  const queryClient = useQueryClient();
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilter]   = useState('all');
  const [viewAppt, setViewAppt]     = useState(null);
  const [assignAppt, setAssignAppt] = useState(null);

  const { data, isLoading }    = useQuery({ queryKey: ['supervisorAppointments'], queryFn: fetchMyAppointments });
  const { data: teamData }     = useQuery({ queryKey: ['myTeam'], queryFn: fetchMyTeam, enabled: !!assignAppt });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) =>
      axiosInstance.put(`/appointments/${id}/status`, { status }).then(r => r.data),
    onSuccess: () => {
      toast.success('Appointment updated.');
      queryClient.invalidateQueries(['supervisorAppointments']);
      setViewAppt(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update.'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => axiosInstance.put(`/appointments/${id}/cancel`).then(r => r.data),
    onSuccess: () => {
      toast.success('Appointment cancelled.');
      queryClient.invalidateQueries(['supervisorAppointments']);
      setViewAppt(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to cancel.'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, mechanic_id }) =>
      axiosInstance.put(`/appointments/${id}/assign-mechanic`, { mechanic_id }).then(r => r.data),
    onSuccess: () => {
      toast.success('Mechanic assigned.');
      queryClient.invalidateQueries(['supervisorAppointments']);
      setAssignAppt(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to assign mechanic.'),
  });

  const appointments = data?.data || [];
  const team         = teamData?.data || [];

  const filtered = appointments.filter((a) => {
    const matchSearch = `${a.service_type} ${a.client_name} ${a.vehicle_name} ${a.plate_number}`
      .toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <PageWrapper title="My Appointments" subtitle="Appointments where clients chose you as their supervisor.">

      {/* ── Top Bar ──────────────────────────────────────── */}
      <GlassCard className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input type="text" placeholder="Search appointments..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-4 py-2
                text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilter(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl px-3 py-2
              text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
            <option value="all" className="bg-slate-800">All</option>
            {['pending', 'confirmed', 'completed', 'cancelled'].map(s => (
              <option key={s} value={s} className="bg-slate-800 capitalize">{s}</option>
            ))}
          </select>
        </div>
      </GlassCard>

      {/* ── Appointments List ─────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="md" text="Loading appointments..." />
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-16 gap-2">
          <Calendar size={36} className="text-white/20" />
          <p className="text-white/40 text-sm">
            {appointments.length === 0
              ? 'No clients have booked an appointment with you yet.'
              : 'No results found.'}
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const badge    = getApptBadge(a.status);
            const canAct   = ['pending', 'confirmed'].includes(a.status);
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
                      {a.client_name} • {a.vehicle_name} ({a.plate_number})
                    </p>
                    <p className="text-white/30 text-xs">
                      {new Date(a.appointment_date).toLocaleDateString('en-KE', {
                        weekday: 'short', year: 'numeric', month: 'short',
                        day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                    {a.mechanic_name && (
                      <p className="text-white/30 text-xs">Mechanic: {a.mechanic_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canAct && (
                      <button onClick={() => setAssignAppt(a)}
                        className="p-2 rounded-xl text-white/40 hover:text-blue-400
                          hover:bg-blue-500/10 transition-all" title="Assign mechanic">
                        <Users size={15} />
                      </button>
                    )}
                    {a.status === 'pending' && (
                      <button
                        onClick={() => statusMutation.mutate({ id: a.id, status: 'confirmed' })}
                        className="p-2 rounded-xl text-white/40 hover:text-emerald-400
                          hover:bg-emerald-500/10 transition-all" title="Confirm">
                        <Check size={15} />
                      </button>
                    )}
                    {canAct && (
                      <button onClick={() => cancelMutation.mutate(a.id)}
                        className="p-2 rounded-xl text-white/40 hover:text-red-400
                          hover:bg-red-500/10 transition-all" title="Cancel">
                        <X size={15} />
                      </button>
                    )}
                    <button onClick={() => setViewAppt(a)}
                      className="p-2 rounded-xl text-white/40 hover:text-white
                        hover:bg-white/10 transition-all" title="View">
                      <Eye size={15} />
                    </button>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* ── View Appointment Modal ────────────────────────── */}
      {viewAppt && (
        <Modal isOpen={!!viewAppt} onClose={() => setViewAppt(null)} title="Appointment Details" size="sm">
          <div className="space-y-3">
            {[
              { label: 'Service',  value: viewAppt.service_type },
              { label: 'Client',   value: viewAppt.client_name },
              { label: 'Phone',    value: viewAppt.client_phone },
              { label: 'Vehicle',  value: `${viewAppt.vehicle_name} (${viewAppt.plate_number})` },
              { label: 'Date',     value: new Date(viewAppt.appointment_date).toLocaleDateString('en-KE', {
                  weekday: 'long', year: 'numeric', month: 'long',
                  day: 'numeric', hour: '2-digit', minute: '2-digit',
                })},
              { label: 'Status',   value: viewAppt.status },
              { label: 'Mechanic', value: viewAppt.mechanic_name || 'Not assigned' },
              { label: 'Notes',    value: viewAppt.notes || 'None' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start justify-between gap-3 p-3
                bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/40 text-sm flex-shrink-0">{label}</p>
                <p className="text-white text-sm text-right capitalize">{value}</p>
              </div>
            ))}
            {['pending', 'confirmed'].includes(viewAppt.status) && (
              <div className="flex gap-3 pt-1">
                {viewAppt.status === 'pending' && (
                  <button
                    onClick={() => statusMutation.mutate({ id: viewAppt.id, status: 'confirmed' })}
                    disabled={statusMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500
                      text-white font-semibold rounded-xl py-2.5 text-sm
                      disabled:opacity-50 transition-all"
                  >
                    Confirm
                  </button>
                )}
                <button
                  onClick={() => cancelMutation.mutate(viewAppt.id)}
                  disabled={cancelMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-red-500 to-rose-500
                    text-white font-semibold rounded-xl py-2.5 text-sm
                    disabled:opacity-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Assign Mechanic Modal ─────────────────────────── */}
      {assignAppt && (
        <Modal isOpen={!!assignAppt} onClose={() => setAssignAppt(null)} title="Assign Mechanic" size="sm">
          <div className="space-y-3">
            <p className="text-white/50 text-sm">
              Assign a mechanic from your team to this appointment.
            </p>
            {team.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-4">No mechanics on your team.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {team.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3
                    bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center
                      justify-center text-emerald-400 font-bold text-sm flex-shrink-0">
                      {m.first_name.charAt(0)}{m.last_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold">
                        {m.first_name} {m.last_name}
                      </p>
                      <p className="text-white/40 text-xs">{m.specialization || 'General'}</p>
                    </div>
                    <button
                      onClick={() => assignMutation.mutate({ id: assignAppt.id, mechanic_id: m.id })}
                      disabled={assignMutation.isPending}
                      className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300
                        text-xs font-semibold rounded-xl px-3 py-1.5 transition-all disabled:opacity-50"
                    >
                      Assign
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setAssignAppt(null)}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold
                rounded-xl py-2.5 text-sm border border-white/20 transition-all">
              Close
            </button>
          </div>
        </Modal>
      )}

    </PageWrapper>
  );
};

export default SupervisorAppointments;