import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Car, Eye, ChevronRight, Wrench } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';

// ─── Fetchers ─────────────────────────────────────────────
const fetchMyVehicles = async () => {
  const res = await axiosInstance.get('/vehicles/my-vehicles');
  return res.data;
};

const fetchJobsByVehicle = async (vehicleId) => {
  const res = await axiosInstance.get(`/job-cards/vehicle/${vehicleId}`);
  return res.data;
};

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

// ─── Vehicle Job Section ──────────────────────────────────
const VehicleJobSection = ({ vehicle, onViewJob }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['vehicleJobs', vehicle.id],
    queryFn: () => fetchJobsByVehicle(vehicle.id),
  });

  const jobs = data?.data || [];

  return (
    <GlassCard className="p-5 mb-4">
      {/* Vehicle Header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/20
          flex items-center justify-center flex-shrink-0">
          <Car size={18} className="text-blue-400" />
        </div>
        <div className="flex-1">
          <p className="text-white font-bold text-sm">
            {vehicle.make} {vehicle.model} {vehicle.year}
          </p>
          <p className="text-white/40 text-xs font-mono">{vehicle.plate_number}</p>
        </div>
        <span className="text-white/30 text-xs">
          {isLoading ? '...' : `${jobs.length} job${jobs.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Jobs */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Spinner size="sm" text="Loading jobs..." />
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex items-center justify-center py-6 gap-2">
          <ClipboardList size={20} className="text-white/20" />
          <p className="text-white/30 text-sm">No service history for this vehicle.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => {
            const badge = getStatusBadge(job.status);
            return (
              <div
                key={job.id}
                onClick={() => onViewJob(job, vehicle)}
                className="flex items-start gap-3 p-3 bg-white/5 rounded-xl
                  border border-white/10 hover:bg-white/10 cursor-pointer
                  transition-all duration-200 group"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                  ${job.status === 'completed' ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                  <Wrench size={13} className={job.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {job.description}
                  </p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {job.mechanic_name && (
                      <span className="text-white/30 text-xs">
                        Mechanic: {job.mechanic_name}
                      </span>
                    )}
                    {job.actual_completion && (
                      <span className="text-white/30 text-xs">
                        Completed: {new Date(job.actual_completion).toLocaleDateString('en-KE')}
                      </span>
                    )}
                    {!job.actual_completion && (
                      <span className="text-white/30 text-xs">
                        Started: {new Date(job.created_at).toLocaleDateString('en-KE')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge label={badge.label} variant={badge.variant} />
                  <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
};

// ─── Main Page ────────────────────────────────────────────
const MyServiceHistory = () => {
  const [viewJob, setViewJob]         = useState(null);
  const [viewVehicle, setViewVehicle] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['myVehicles'],
    queryFn: fetchMyVehicles,
  });

  const vehicles = data?.data || [];

  return (
    <PageWrapper
      title="Service History"
      subtitle="View all past and current jobs for your vehicles."
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="md" text="Loading service history..." />
        </div>
      ) : vehicles.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-16 gap-2">
          <Car size={36} className="text-white/20" />
          <p className="text-white/40 text-sm">No vehicles registered yet.</p>
          <p className="text-white/25 text-xs">Contact us to register your vehicle.</p>
        </GlassCard>
      ) : (
        vehicles.map((vehicle) => (
          <VehicleJobSection
            key={vehicle.id}
            vehicle={vehicle}
            onViewJob={(job, v) => { setViewJob(job); setViewVehicle(v); }}
          />
        ))
      )}

      {/* ── View Job Detail Modal ────────────────────────── */}
      {viewJob && (
        <Modal
          isOpen={!!viewJob}
          onClose={() => { setViewJob(null); setViewVehicle(null); }}
          title="Service Details"
          size="md"
        >
          <div className="space-y-3">
            {/* Vehicle */}
            {viewVehicle && (
              <div className="flex items-center gap-3 p-3 bg-blue-500/10
                rounded-xl border border-blue-500/20">
                <Car size={15} className="text-blue-400 flex-shrink-0" />
                <p className="text-white text-sm font-medium">
                  {viewVehicle.make} {viewVehicle.model} — {viewVehicle.plate_number}
                </p>
              </div>
            )}

            {/* Status pipeline */}
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <p className="text-white/40 text-xs mb-2">Status</p>
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
                      <ChevronRight size={11} className="text-white/20" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Details */}
            {[
              { label: 'Description', value: viewJob.description },
              { label: 'Mechanic',    value: viewJob.mechanic_name || 'Not assigned' },
              { label: 'Notes',       value: viewJob.notes || 'None' },
              { label: 'Date Started', value: new Date(viewJob.created_at).toLocaleDateString('en-KE', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })},
              ...(viewJob.actual_completion ? [{
                label: 'Completed On',
                value: new Date(viewJob.actual_completion).toLocaleDateString('en-KE', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })
              }] : []),
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
    </PageWrapper>
  );
};

export default MyServiceHistory;