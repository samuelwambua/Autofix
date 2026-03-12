import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Car, Eye, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';

const fetchMyVehicles = async () => {
  const res = await axiosInstance.get('/vehicles/my-vehicles');
  return res.data;
};

const MyVehicles = () => {
  const navigate  = useNavigate();
  const [viewVehicle, setViewVehicle] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['myVehicles'],
    queryFn: fetchMyVehicles,
  });

  const vehicles = data?.data || [];

  return (
    <PageWrapper title="My Vehicles" subtitle="All vehicles registered under your account.">

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="md" text="Loading vehicles..." />
        </div>
      ) : vehicles.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-16 gap-2">
          <Car size={36} className="text-white/20" />
          <p className="text-white/40 text-sm">No vehicles registered yet.</p>
          <p className="text-white/25 text-xs">Contact us to register your vehicle.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {vehicles.map((v) => (
            <GlassCard key={v.id} className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-500/30
                    flex items-center justify-center flex-shrink-0">
                    <Car size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">
                      {v.make} {v.model}
                    </p>
                    <p className="text-white/40 text-xs font-mono">{v.plate_number}</p>
                  </div>
                </div>
                <span className="text-white/40 text-sm font-semibold">{v.year}</span>
              </div>

              {/* Details */}
              <div className="space-y-2 mb-4">
                {[
                  { label: 'Color',   value: v.color },
                  { label: 'Mileage', value: `${v.mileage?.toLocaleString() || 0} km` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between
                    text-sm px-3 py-2 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-white/40">{label}</span>
                    <span className="text-white font-medium">{value}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setViewVehicle(v)}
                  className="flex-1 flex items-center justify-center gap-2
                    bg-white/10 hover:bg-white/20 text-white text-xs font-semibold
                    rounded-xl py-2 border border-white/20 transition-all"
                >
                  <Eye size={13} /> Details
                </button>
                <button
                  onClick={() => navigate('/client/appointments')}
                  className="flex-1 flex items-center justify-center gap-2
                    bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-semibold
                    rounded-xl py-2 border border-blue-500/20 transition-all"
                >
                  <Calendar size={13} /> Book Service
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* ── View Vehicle Modal ───────────────────────────── */}
      {viewVehicle && (
        <Modal isOpen={!!viewVehicle} onClose={() => setViewVehicle(null)} title="Vehicle Details" size="sm">
          <div className="space-y-3">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30
                flex items-center justify-center">
                <Car size={22} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-bold">
                  {viewVehicle.make} {viewVehicle.model}
                </h3>
                <span className="font-mono text-white/40 text-xs">{viewVehicle.plate_number}</span>
              </div>
            </div>
            {[
              { label: 'Year',    value: viewVehicle.year },
              { label: 'Color',   value: viewVehicle.color },
              { label: 'Mileage', value: `${viewVehicle.mileage?.toLocaleString() || 0} km` },
              { label: 'Registered', value: new Date(viewVehicle.created_at).toLocaleDateString('en-KE') },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between p-3
                bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/40 text-sm">{label}</p>
                <p className="text-white text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}

    </PageWrapper>
  );
};

export default MyVehicles;