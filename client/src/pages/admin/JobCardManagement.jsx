import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ClipboardList, Plus, Search, Eye, Trash2,
  Wrench, Car, User, Package,
  ArrowRight, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAllJobCardsApi, createJobCardApi, updateJobCardStatusApi,
  deleteJobCardApi, assignMechanicToJobApi, getJobMechanicsApi,
  removeMechanicFromJobApi, addPartsToJobApi,
} from '../../api/jobCardApi';
import { getAllVehiclesApi } from '../../api/vehicleApi';
import { getMechanicsApi } from '../../api/staffApi';
import { getAllInventoryApi } from '../../api/inventoryApi';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';

// ─── Helpers ──────────────────────────────────────────────
const JOB_STATUSES = [
  { value: 'received',       label: 'Received',       variant: 'info' },
  { value: 'diagnosing',     label: 'Diagnosing',     variant: 'warning' },
  { value: 'awaiting_parts', label: 'Awaiting Parts', variant: 'warning' },
  { value: 'in_progress',    label: 'In Progress',    variant: 'info' },
  { value: 'quality_check',  label: 'Quality Check',  variant: 'purple' },
  { value: 'completed',      label: 'Completed',      variant: 'success' },
];

const getStatusBadge = (status) => {
  const s = JOB_STATUSES.find((j) => j.value === status);
  return s || { variant: 'neutral', label: status };
};

const getNextStatus = (current) => {
  const idx = JOB_STATUSES.findIndex((j) => j.value === current);
  return idx < JOB_STATUSES.length - 1 ? JOB_STATUSES[idx + 1] : null;
};

// ─── Schema ───────────────────────────────────────────────
const createSchema = z.object({
  vehicle_id:  z.string().min(1, 'Please select a vehicle.'),
  description: z.string().min(5, 'Description must be at least 5 characters.'),
  notes:       z.string().optional(),
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

const JobCardManagement = () => {
  const queryClient = useQueryClient();
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState('all');
  const [showCreate, setShowCreate]       = useState(false);
  const [viewJob, setViewJob]             = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [assignJob, setAssignJob]         = useState(null);
  const [addPartsJob, setAddPartsJob]     = useState(null);
  const [selectedMechanic, setSelectedMechanic] = useState('');
  const [selectedPart, setSelectedPart]         = useState('');
  const [partQty, setPartQty]                   = useState(1);

  // ─── Queries ──────────────────────────────────────────
  const { data, isLoading } = useQuery({ queryKey: ['jobCards'],  queryFn: getAllJobCardsApi });
  const { data: vehiclesData }  = useQuery({ queryKey: ['vehicles'],  queryFn: getAllVehiclesApi });
  const { data: mechanicsData } = useQuery({ queryKey: ['mechanics'], queryFn: getMechanicsApi });
  const { data: inventoryData } = useQuery({ queryKey: ['inventory'], queryFn: getAllInventoryApi });

  const { data: jobMechanicsData, refetch: refetchMechanics } = useQuery({
    queryKey: ['jobMechanics', viewJob?.id],
    queryFn:  () => getJobMechanicsApi(viewJob.id),
    enabled:  !!viewJob,
  });

  // ─── Mutations ────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createJobCardApi,
    onSuccess: () => {
      toast.success('Job card created successfully.');
      queryClient.invalidateQueries(['jobCards']);
      setShowCreate(false); reset();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create job card.'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateJobCardStatusApi(id, { status }),
    onSuccess: () => {
      toast.success('Status updated successfully.');
      queryClient.invalidateQueries(['jobCards']);
      setViewJob(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update status.'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteJobCardApi,
    onSuccess: () => {
      toast.success('Job card deleted.');
      queryClient.invalidateQueries(['jobCards']);
      setConfirmDelete(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete job card.'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, mechanic_id }) => assignMechanicToJobApi(id, { mechanic_id }),
    onSuccess: () => {
      toast.success('Mechanic assigned successfully.');
      queryClient.invalidateQueries(['jobCards', 'jobMechanics']);
      setAssignJob(null); setSelectedMechanic('');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to assign mechanic.'),
  });

  const removeMechanicMutation = useMutation({
    mutationFn: ({ jobId, mechanicId }) => removeMechanicFromJobApi(jobId, mechanicId),
    onSuccess: () => {
      toast.success('Mechanic removed.');
      queryClient.invalidateQueries(['jobMechanics']);
      refetchMechanics();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to remove mechanic.'),
  });

  const addPartsMutation = useMutation({
    mutationFn: ({ id, part_id, quantity_used }) =>
      addPartsToJobApi(id, { part_id, quantity_used }),
    onSuccess: () => {
      toast.success('Part added to job.');
      queryClient.invalidateQueries(['jobCards', 'inventory']);
      setSelectedPart(''); setPartQty(1);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add part.'),
  });

  // ─── Form ─────────────────────────────────────────────
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(createSchema),
  });

  const onSubmit = (data) => createMutation.mutate(data);

  // ─── Filter ───────────────────────────────────────────
  const jobCards  = data?.data || [];
  const vehicles  = vehiclesData?.data || [];
  const mechanics = mechanicsData?.data || [];
  const inventory = inventoryData?.data || [];
  const jobMechanics = jobMechanicsData?.data || [];

  const availableParts = inventory.filter((i) => i.quantity > 0);

  const filtered = jobCards.filter((j) => {
    const matchSearch =
      `${j.description} ${j.plate_number} ${j.client_name} ${j.vehicle_name}`
        .toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || j.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <PageWrapper title="Job Cards" subtitle="Manage all vehicle repair job cards.">

      {/* ── Top Bar ────────────────────────────────────── */}
      <GlassCard className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search job cards..."
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
              <option value="all" className="bg-slate-800">All Statuses</option>
              {JOB_STATUSES.map((s) => (
                <option key={s.value} value={s.value} className="bg-slate-800">{s.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => { setShowCreate(true); reset(); }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500
              hover:from-blue-600 hover:to-indigo-600 text-white font-semibold
              rounded-xl px-4 py-2 text-sm shadow-lg shadow-blue-500/30
              transition-all duration-200 whitespace-nowrap"
          >
            <Plus size={16} /> New Job Card
          </button>
        </div>
      </GlassCard>

      {/* ── Job Cards Table ─────────────────────────────── */}
      <GlassCard className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="md" text="Loading job cards..." />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <ClipboardList size={36} className="text-white/20" />
            <p className="text-white/40 text-sm">No job cards found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {['Description', 'Vehicle', 'Client', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-white/50 text-xs font-semibold
                      uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((j) => {
                  const badge = getStatusBadge(j.status);
                  const next  = getNextStatus(j.status);
                  return (
                    <tr key={j.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/20
                            flex items-center justify-center flex-shrink-0">
                            <ClipboardList size={15} className="text-emerald-400" />
                          </div>
                          <p className="text-white text-sm font-medium max-w-xs truncate">
                            {j.description}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white/70 text-sm">{j.vehicle_name}</p>
                        <p className="text-white/40 text-xs font-mono">{j.plate_number}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white/70 text-sm">{j.client_name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge label={badge.label} variant={badge.variant} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setViewJob(j)}
                            className="p-1.5 rounded-lg text-white/40 hover:text-blue-400
                              hover:bg-blue-500/10 transition-all" title="View">
                            <Eye size={15} />
                          </button>
                          <button onClick={() => { setAssignJob(j); setSelectedMechanic(''); }}
                            className="p-1.5 rounded-lg text-white/40 hover:text-emerald-400
                              hover:bg-emerald-500/10 transition-all" title="Assign Mechanic">
                            <Wrench size={15} />
                          </button>
                          <button onClick={() => { setAddPartsJob(j); setSelectedPart(''); setPartQty(1); }}
                            className="p-1.5 rounded-lg text-white/40 hover:text-amber-400
                              hover:bg-amber-500/10 transition-all" title="Add Parts">
                            <Package size={15} />
                          </button>
                          {next && (
                            <button
                              onClick={() => statusMutation.mutate({ id: j.id, status: next.value })}
                              disabled={statusMutation.isPending}
                              className="p-1.5 rounded-lg text-white/40 hover:text-purple-400
                                hover:bg-purple-500/10 transition-all"
                              title={`Move to: ${next.label}`}
                            >
                              <ArrowRight size={15} />
                            </button>
                          )}
                          <button onClick={() => setConfirmDelete(j)}
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

      {/* ── Create Job Card Modal ───────────────────────── */}
      <Modal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); reset(); }}
        title="New Job Card"
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Vehicle" error={errors.vehicle_id?.message}>
            <select {...register('vehicle_id')} className={inputClass(!!errors.vehicle_id)}>
              <option value="" className="bg-slate-800">Select vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id} className="bg-slate-800">
                  {v.make} {v.model} — {v.plate_number} ({v.owner_name})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description" error={errors.description?.message}>
            <textarea
              rows={3}
              placeholder="Describe the issue or work to be done..."
              {...register('description')}
              className={`${inputClass(!!errors.description)} resize-none`}
            />
          </Field>
          <Field label="Notes (optional)" error={errors.notes?.message}>
            <textarea
              rows={2}
              placeholder="Any additional notes..."
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
                : 'Create Job Card'
              }
            </button>
          </div>
        </form>
      </Modal>

      {/* ── View Job Card Modal ─────────────────────────── */}
      {viewJob && (
        <Modal isOpen={!!viewJob} onClose={() => setViewJob(null)} title="Job Card Details" size="md">
          <div className="space-y-4">
            <div className="space-y-3">
              {[
                { icon: ClipboardList, label: 'Description', value: viewJob.description },
                { icon: Car,           label: 'Vehicle',     value: `${viewJob.vehicle_name} (${viewJob.plate_number})` },
                { icon: User,          label: 'Client',      value: viewJob.client_name },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 p-3
                  bg-white/5 rounded-xl border border-white/10">
                  <Icon size={15} className="text-white/40 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white/40 text-xs">{label}</p>
                    <p className="text-white text-sm">{value}</p>
                  </div>
                </div>
              ))}
              {viewJob.notes && (
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-white/40 text-xs mb-1">Notes</p>
                  <p className="text-white text-sm">{viewJob.notes}</p>
                </div>
              )}
            </div>

            {/* Status pipeline */}
            <div>
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">
                Status Pipeline
              </p>
              <div className="flex items-center gap-1 flex-wrap">
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
                    {i < JOB_STATUSES.length - 1 && (
                      <ChevronRight size={12} className="text-white/20" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Assigned mechanics */}
            <div>
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">
                Assigned Mechanics
              </p>
              {jobMechanics.length > 0 ? (
                <div className="space-y-2">
                  {jobMechanics.map((m) => (
                    <div key={m.mechanic_id} className="flex items-center justify-between
                      p-2.5 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20
                          flex items-center justify-center text-xs font-bold text-emerald-400">
                          {m.mechanic_name?.charAt(0)}
                        </div>
                        <p className="text-white text-sm">{m.mechanic_name}</p>
                      </div>
                      <button
                        onClick={() => removeMechanicMutation.mutate({ jobId: viewJob.id, mechanicId: m.mechanic_id })}
                        className="text-white/30 hover:text-red-400 transition-colors text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/30 text-sm">No mechanics assigned yet.</p>
              )}
            </div>

            {/* Advance status */}
            {getNextStatus(viewJob.status) && (
              <button
                onClick={() => statusMutation.mutate({ id: viewJob.id, status: getNextStatus(viewJob.status).value })}
                disabled={statusMutation.isPending}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500
                  text-white font-semibold rounded-xl py-2.5 text-sm
                  flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <ArrowRight size={15} />
                Move to: {getNextStatus(viewJob.status).label}
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* ── Assign Mechanic Modal ───────────────────────── */}
      {assignJob && (
        <Modal
          isOpen={!!assignJob}
          onClose={() => { setAssignJob(null); setSelectedMechanic(''); }}
          title="Assign Mechanic"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-white/60 text-sm">
              Assigning to: <span className="text-white font-medium">{assignJob.description}</span>
            </p>
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
              <button onClick={() => { setAssignJob(null); setSelectedMechanic(''); }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                  rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                Cancel
              </button>
              <button
                onClick={() => assignMutation.mutate({ id: assignJob.id, mechanic_id: selectedMechanic })}
                disabled={!selectedMechanic || assignMutation.isPending}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500
                  text-white font-semibold rounded-xl py-2.5 text-sm
                  transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {assignMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Assigning...</>
                  : 'Assign Mechanic'
                }
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Add Parts Modal ─────────────────────────────── */}
      {addPartsJob && (
        <Modal
          isOpen={!!addPartsJob}
          onClose={() => { setAddPartsJob(null); setSelectedPart(''); setPartQty(1); }}
          title="Add Parts to Job"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-white/60 text-sm">
              Job: <span className="text-white font-medium">{addPartsJob.description}</span>
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-white/70 text-sm font-medium">Select Part</label>
              <select
                value={selectedPart}
                onChange={(e) => setSelectedPart(e.target.value)}
                className={inputClass(false)}
              >
                <option value="" className="bg-slate-800">Select part...</option>
                {availableParts.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-800">
                    {p.name} — Stock: {p.quantity} — KES {parseFloat(p.unit_cost).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-white/70 text-sm font-medium">Quantity</label>
              <input
                type="number"
                min={1}
                value={partQty}
                onChange={(e) => setPartQty(parseInt(e.target.value) || 1)}
                className={inputClass(false)}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setAddPartsJob(null); setSelectedPart(''); setPartQty(1); }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                  rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                Cancel
              </button>
              <button
                onClick={() => addPartsMutation.mutate({
                  id: addPartsJob.id,
                  part_id: selectedPart,
                  quantity_used: partQty,
                })}
                disabled={!selectedPart || addPartsMutation.isPending}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500
                  text-white font-semibold rounded-xl py-2.5 text-sm
                  transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {addPartsMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Adding...</>
                  : 'Add Part'
                }
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Confirm Delete Modal ────────────────────────── */}
      {confirmDelete && (
        <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Job Card" size="sm">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30
              flex items-center justify-center mx-auto">
              <Trash2 size={24} className="text-red-400" />
            </div>
            <div>
              <p className="text-white font-medium">Delete this job card?</p>
              <p className="text-white/50 text-sm mt-1 line-clamp-2">{confirmDelete.description}</p>
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

export default JobCardManagement;