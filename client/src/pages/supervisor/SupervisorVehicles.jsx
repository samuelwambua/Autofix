import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Car, Search, Eye } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';

const fetchMyVehicles = () => axiosInstance.get('/supervisor/vehicles').then(r => r.data);

const SupervisorVehicles = () => {
  const [search, setSearch]       = useState('');
  const [viewVehicle, setViewVehicle] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['supervisorVehicles'], queryFn: fetchMyVehicles });
  const vehicles = data?.data || [];

  const filtered = vehicles.filter(v =>
    `${v.make} ${v.model} ${v.plate_number} ${v.owner_name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageWrapper title="Vehicles" subtitle="All vehicles belonging to your clients.">
      <GlassCard className="p-4 mb-6">
        <div className="relative max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input type="text" placeholder="Search vehicles..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-4 py-2
              text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
        </div>
      </GlassCard>

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Spinner size="md" text="Loading vehicles..." /></div>
      ) : filtered.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-16 gap-2">
          <Car size={36} className="text-white/20" />
          <p className="text-white/40 text-sm">No vehicles found.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((v) => (
            <GlassCard key={v.id} className="p-5">
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
              <div className="space-y-1.5 mb-4">
                {[
                  { label: 'Owner',   value: v.owner_name },
                  { label: 'Color',   value: v.color || '—' },
                  { label: 'Mileage', value: `${v.mileage?.toLocaleString() || 0} km` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center p-2
                    bg-white/5 rounded-xl border border-white/10 text-xs">
                    <span className="text-white/40">{label}</span>
                    <span className="text-white font-medium">{value}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setViewVehicle(v)}
                className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20
                  text-white text-xs font-semibold rounded-xl py-2 border border-white/20 transition-all">
                <Eye size={13} /> View Details
              </button>
            </GlassCard>
          ))}
        </div>
      )}

      {viewVehicle && (
        <Modal isOpen={!!viewVehicle} onClose={() => setViewVehicle(null)} title="Vehicle Details" size="sm">
          <div className="space-y-3">
            {[
              { label: 'Make & Model', value: `${viewVehicle.make} ${viewVehicle.model}` },
              { label: 'Year',        value: viewVehicle.year },
              { label: 'Plate',       value: viewVehicle.plate_number },
              { label: 'Color',       value: viewVehicle.color || '—' },
              { label: 'Mileage',     value: `${viewVehicle.mileage?.toLocaleString() || 0} km` },
              { label: 'Owner',       value: viewVehicle.owner_name },
              { label: 'Owner Phone', value: viewVehicle.owner_phone },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
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

export default SupervisorVehicles;