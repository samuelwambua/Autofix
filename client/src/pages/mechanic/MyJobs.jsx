import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench, Search, Eye, ArrowRight,
  Car, User, ChevronRight, ClipboardList,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getMyJobsApi, updateJobCardStatusApi } from '../../api/jobCardApi';
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
  return idx !== -1 && idx < JOB_STATUSES.length - 1
    ? JOB_STATUSES[idx + 1]
    : null;
};

const MyJobs = () => {
  const queryClient = useQueryClient();
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewJob, setViewJob]         = useState(null);

  // ─── Queries ──────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['myJobs'],
    queryFn: getMyJobsApi,
    refetchInterval: 30000,
  });

  // ─── Mutations ────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateJobCardStatusApi(id, { status }),
    onSuccess: (_, vars) => {
      const next = JOB_STATUSES.find((s) => s.value === vars.status);
      toast.success(`Job moved to: ${next?.label}`);
      queryClient.invalidateQueries(['myJobs', 'mechanicDashboard']);
      setViewJob(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update status.'),
  });

  // ─── Filter ───────────────────────────────────────────
  const jobs = data?.data || [];

  const filtered = jobs.filter((j) => {
    const matchSearch =
      `${j.description} ${j.vehicle_name} ${j.plate_number} ${j.client_name}`
        .toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || j.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Stats
  const activeCount    = jobs.filter((j) => j.status !== 'completed').length;
  const completedCount = jobs.filter((j) => j.status === 'completed').length;

  return (
    <PageWrapper title="My Jobs" subtitle="All jobs assigned to you.">

      {/* ── Quick Stats ──────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Jobs',  value: jobs.length,    color: 'text-white' },
          { label: 'Active',      value: activeCount,    color: 'text-blue-400' },
          { label: 'Completed',   value: completedCount, color: 'text-emerald-400' },
        ].map(({ label, value, color }) => (
          <GlassCard key={label} className="p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-white/40 text-xs mt-1">{label}</p>
          </GlassCard>
        ))}
      </div>

      {/* ── Filters ──────────────────────────────────────── */}
      <GlassCard className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search jobs..."
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
      </GlassCard>

      {/* ── Jobs List ────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="md" text="Loading your jobs..." />
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-16 gap-2">
          <Wrench size={36} className="text-white/20" />
          <p className="text-white/40 text-sm">No jobs found.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => {
            const badge = getStatusBadge(job.status);
            const next  = getNextStatus(job.status);
            return (
              <GlassCard
                key={job.id}
                className="p-4 hover:bg-white/15 transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                    ${job.status === 'completed' ? 'bg-emerald-500/20' : 'bg-blue-500/20'}`}>
                    <Wrench size={16} className={job.status === 'completed' ? 'text-emerald-400' : 'text-blue-400'} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className="text-white font-semibold text-sm">{job.description}</p>
                      <Badge label={badge.label} variant={badge.variant} />
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-white/40 text-xs">
                        <Car size={11} /> {job.vehicle_name}
                      </span>
                      <span className="text-white/30 text-xs font-mono">{job.plate_number}</span>
                      <span className="flex items-center gap-1 text-white/40 text-xs">
                        <User size={11} /> {job.client_name}
                      </span>
                    </div>
                    {job.notes && (
                      <p className="text-white/30 text-xs mt-1.5 line-clamp-1">
                        📝 {job.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setViewJob(job)}
                      className="p-2 rounded-xl text-white/40 hover:text-blue-400
                        hover:bg-blue-500/10 transition-all" title="View Details"
                    >
                      <Eye size={15} />
                    </button>
                    {next && (
                      <button
                        onClick={() => statusMutation.mutate({ id: job.id, status: next.value })}
                        disabled={statusMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                          bg-blue-500/20 hover:bg-blue-500/30 text-blue-300
                          text-xs font-semibold transition-all disabled:opacity-50"
                        title={`Move to: ${next.label}`}
                      >
                        <ArrowRight size={12} /> {next.label}
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* ── View Job Modal ───────────────────────────────── */}
      {viewJob && (
        <Modal isOpen={!!viewJob} onClose={() => setViewJob(null)} title="Job Details" size="md">
          <div className="space-y-4">
            {/* Details */}
            <div className="space-y-3">
              {[
                { icon: ClipboardList, label: 'Description', value: viewJob.description },
                { icon: Car,           label: 'Vehicle',     value: `${viewJob.vehicle_name} (${viewJob.plate_number})` },
                { icon: User,          label: 'Client',      value: `${viewJob.client_name} • ${viewJob.client_phone}` },
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

            {/* Advance status */}
            {getNextStatus(viewJob.status) && (
              <button
                onClick={() => statusMutation.mutate({
                  id: viewJob.id,
                  status: getNextStatus(viewJob.status).value
                })}
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

    </PageWrapper>
  );
};

export default MyJobs;