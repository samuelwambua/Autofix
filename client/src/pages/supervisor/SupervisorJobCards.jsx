import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ClipboardList, Plus, Search, Eye, ChevronRight, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';

// ─── API calls ────────────────────────────────────────────
const fetchMyJobCards  = () => axiosInstance.get('/supervisor/job-cards').then(r => r.data);
const fetchMyTeam      = () => axiosInstance.get('/supervisor/team').then(r => r.data);
const fetchAllVehicles = () => axiosInstance.get('/vehicles').then(r => r.data);

const JOB_STATUSES = [
  { value: 'received',       label: 'Received',       variant: 'info' },
  { value: 'diagnosing',     label: 'Diagnosing',     variant: 'warning' },
  { value: 'awaiting_parts', label: 'Awaiting Parts', variant: 'warning' },
  { value: 'in_progress',    label: 'In Progress',    variant: 'info' },
  { value: 'quality_check',  label: 'Quality Check',  variant: 'purple' },
  { value: 'completed',      label: 'Completed',      variant: 'success' },
];

const getStatusBadge = (status) =>
  JOB_STATUSES.find(s => s.value === status) || { variant: 'neutral', label: status };

const STATUS_ORDER = JOB_STATUSES.map(s => s.value);
const nextStatus   = (current) => {
  const idx = STATUS_ORDER.indexOf(current);
  return idx >= 0 && idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;
};

const jobSchema = z.object({
  vehicle_id:  z.string().min(1, 'Please select a vehicle.'),
  mechanic_id: z.string().optional(),
  description: z.string().min(5, 'Description must be at least 5 characters.'),
  notes:       z.string().optional(),
});

const inputClass = (hasError) =>
  `w-full bg-white/10 border rounded-xl px-4 py-2.5 text-white
   placeholder-white/30 text-sm focus:outline-none focus:ring-2
   focus:ring-blue-500/50 transition-all
   ${hasError ? 'border-red-400/50' : 'border-white/20'}`;

const SupervisorJobCards = () => {
  const queryClient = useQueryClient();
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [viewJob, setViewJob]     = useState(null);
  const [assignJob, setAssignJob] = useState(null);

  const { data, isLoading }        = useQuery({ queryKey: ['supervisorJobCards'], queryFn: fetchMyJobCards });
  const { data: teamData }         = useQuery({ queryKey: ['myTeam'], queryFn: fetchMyTeam });
  const { data: vehiclesData }     = useQuery({ queryKey: ['allVehicles'], queryFn: fetchAllVehicles });

  const createMutation = useMutation({
    mutationFn: (data) => axiosInstance.post('/job-cards', data).then(r => r.data),
    onSuccess: () => {
      toast.success('Job card created.');
      queryClient.invalidateQueries(['supervisorJobCards', 'supervisorDashboard']);
      setShowCreate(false); reset();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create job card.'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => axiosInstance.put(`/job-cards/${id}/status`, { status }).then(r => r.data),
    onSuccess: () => {
      toast.success('Status updated.');
      queryClient.invalidateQueries(['supervisorJobCards', 'supervisorDashboard']);
      setViewJob(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update status.'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, mechanic_id }) =>
      axiosInstance.post(`/job-cards/${id}/assign`, { mechanic_id }).then(r => r.data),
    onSuccess: () => {
      toast.success('Mechanic assigned.');
      queryClient.invalidateQueries(['supervisorJobCards']);
      setAssignJob(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to assign mechanic.'),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(jobSchema),
  });

  const jobs     = data?.data || [];
  const team     = teamData?.data || [];
  const vehicles = vehiclesData?.data || [];

  const filtered = jobs.filter((j) => {
    const matchesSearch = `${j.description} ${j.vehicle_name} ${j.plate_number} ${j.client_name}`
      .toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || j.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <PageWrapper title="Job Cards" subtitle="Create and manage job cards for your team.">

      {/* ── Top Bar ──────────────────────────────────────── */}
      <GlassCard className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text" placeholder="Search jobs..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl
                  pl-9 pr-4 py-2 text-white placeholder-white/30 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <select
              value={filterStatus} onChange={(e) => setFilter(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-xl px-3 py-2
                text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all" className="bg-slate-800">All Statuses</option>
              {JOB_STATUSES.map(s => (
                <option key={s.value} value={s.value} className="bg-slate-800">{s.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => { setShowCreate(true); reset(); }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500
              hover:from-blue-600 hover:to-indigo-600 text-white font-semibold
              rounded-xl px-4 py-2 text-sm shadow-lg shadow-blue-500/30 transition-all whitespace-nowrap"
          >
            <Plus size={16} /> New Job Card
          </button>
        </div>
      </GlassCard>

      {/* ── Jobs List ─────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="md" text="Loading job cards..." />
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-16 gap-3">
          <ClipboardList size={36} className="text-white/20" />
          <p className="text-white/40 text-sm">No job cards found.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => {
            const badge = getStatusBadge(job.status);
            const next  = nextStatus(job.status);
            return (
              <GlassCard key={job.id} className="p-4 hover:bg-white/15 transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center
                    justify-center flex-shrink-0">
                    <ClipboardList size={16} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className="text-white font-semibold text-sm truncate">{job.description}</p>
                      <Badge label={badge.label} variant={badge.variant} />
                    </div>
                    <p className="text-white/40 text-xs mt-1">
                      {job.vehicle_name} • {job.plate_number}
                    </p>
                    <p className="text-white/30 text-xs">Client: {job.client_name}</p>
                    {job.mechanic_name && (
                      <p className="text-white/30 text-xs">Mechanic: {job.mechanic_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {next && (
                      <button
                        onClick={() => statusMutation.mutate({ id: job.id, status: next })}
                        disabled={statusMutation.isPending}
                        className="p-2 rounded-xl text-white/40 hover:text-emerald-400
                          hover:bg-emerald-500/10 transition-all" title={`Advance to ${next}`}
                      >
                        <ChevronRight size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => setAssignJob(job)}
                      className="p-2 rounded-xl text-white/40 hover:text-blue-400
                        hover:bg-blue-500/10 transition-all" title="Assign mechanic"
                    >
                      <Users size={15} />
                    </button>
                    <button
                      onClick={() => setViewJob(job)}
                      className="p-2 rounded-xl text-white/40 hover:text-white
                        hover:bg-white/10 transition-all" title="View details"
                    >
                      <Eye size={15} />
                    </button>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* ── Create Job Card Modal ─────────────────────────── */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); reset(); }}
        title="Create Job Card" size="md">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-white/70 text-sm font-medium">Vehicle</label>
            <select {...register('vehicle_id')} className={inputClass(!!errors.vehicle_id)}>
              <option value="" className="bg-slate-800">Select vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id} className="bg-slate-800">
                  {v.make} {v.model} — {v.plate_number} ({v.owner_name})
                </option>
              ))}
            </select>
            {errors.vehicle_id && <p className="text-red-400 text-xs">{errors.vehicle_id.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-white/70 text-sm font-medium">Assign Mechanic (optional)</label>
            <select {...register('mechanic_id')} className={inputClass(false)}>
              <option value="" className="bg-slate-800">Select mechanic from team...</option>
              {team.map((m) => (
                <option key={m.id} value={m.id} className="bg-slate-800">
                  {m.first_name} {m.last_name} — {m.specialization || 'General'}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-white/70 text-sm font-medium">Description</label>
            <textarea rows={2} placeholder="Describe the work to be done..."
              {...register('description')}
              className={`${inputClass(!!errors.description)} resize-none`} />
            {errors.description && <p className="text-red-400 text-xs">{errors.description.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-white/70 text-sm font-medium">Notes (optional)</label>
            <textarea rows={2} placeholder="Any additional notes..."
              {...register('notes')}
              className={`${inputClass(false)} resize-none`} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowCreate(false); reset(); }}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                rounded-xl py-2.5 text-sm border border-white/20 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500
                text-white font-semibold rounded-xl py-2.5 text-sm
                transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {createMutation.isPending
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</>
                : 'Create Job Card'
              }
            </button>
          </div>
        </form>
      </Modal>

      {/* ── View Job Modal ────────────────────────────────── */}
      {viewJob && (
        <Modal isOpen={!!viewJob} onClose={() => setViewJob(null)} title="Job Details" size="md">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {JOB_STATUSES.map((s, i) => (
                <div key={s.value} className="flex items-center gap-1">
                  <span className={`text-xs px-2 py-1 rounded-lg font-medium
                    ${viewJob.status === s.value
                      ? 'bg-blue-500/30 text-blue-300 border border-blue-500/40'
                      : JOB_STATUSES.findIndex(j => j.value === viewJob.status) > i
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-white/5 text-white/30'
                    }`}>
                    {s.label}
                  </span>
                  {i < JOB_STATUSES.length - 1 && <ChevronRight size={11} className="text-white/20" />}
                </div>
              ))}
            </div>
            {[
              { label: 'Description', value: viewJob.description },
              { label: 'Vehicle',     value: `${viewJob.vehicle_name} (${viewJob.plate_number})` },
              { label: 'Client',      value: viewJob.client_name },
              { label: 'Mechanic',    value: viewJob.mechanic_name || 'Not assigned' },
              { label: 'Notes',       value: viewJob.notes || 'None' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start justify-between gap-3 p-3
                bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/40 text-sm flex-shrink-0">{label}</p>
                <p className="text-white text-sm text-right">{value}</p>
              </div>
            ))}
            {nextStatus(viewJob.status) && (
              <button
                onClick={() => statusMutation.mutate({ id: viewJob.id, status: nextStatus(viewJob.status) })}
                disabled={statusMutation.isPending}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500
                  text-white font-semibold rounded-xl py-2.5 text-sm
                  transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {statusMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Updating...</>
                  : `Advance to "${nextStatus(viewJob.status)?.replace('_', ' ')}"`
                }
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* ── Assign Mechanic Modal ─────────────────────────── */}
      {assignJob && (
        <Modal isOpen={!!assignJob} onClose={() => setAssignJob(null)} title="Assign Team Mechanic" size="sm">
          <div className="space-y-3">
            <p className="text-white/50 text-sm">
              Assign a mechanic from your team to this job.
            </p>
            {team.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-4">No mechanics on your team.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
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
                      onClick={() => assignMutation.mutate({ id: assignJob.id, mechanic_id: m.id })}
                      disabled={assignMutation.isPending}
                      className="flex items-center gap-1 bg-blue-500/20 hover:bg-blue-500/30
                        text-blue-300 text-xs font-semibold rounded-xl px-3 py-1.5
                        border border-blue-500/20 transition-all disabled:opacity-50"
                    >
                      Assign
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setAssignJob(null)}
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

export default SupervisorJobCards;