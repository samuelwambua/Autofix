import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, MapPin, Phone, CheckCircle,
  Clock, Car, Wrench, Navigation,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const fetchActive = () => axiosInstance.get('/emergency/active').then(r => r.data);

const STATUS_BADGE = {
  pending:     { variant: 'warning', label: 'Pending' },
  accepted:    { variant: 'info',    label: 'Accepted' },
  in_progress: { variant: 'success', label: 'In Progress' },
};

const EmergencyDashboard = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['activeEmergencies'],
    queryFn: fetchActive,
    refetchInterval: 15000,
  });

  const acceptMutation = useMutation({
    mutationFn: (id) => axiosInstance.put(`/emergency/${id}/accept`).then(r => r.data),
    onSuccess: (d) => {
      toast.success(d.message);
      queryClient.invalidateQueries(['activeEmergencies']);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) =>
      axiosInstance.put(`/emergency/${id}/status`, { status }).then(r => r.data),
    onSuccess: () => {
      toast.success('Status updated.');
      queryClient.invalidateQueries(['activeEmergencies']);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const requests = data?.data || [];

  return (
    <PageWrapper title="Emergency Requests" subtitle="Active roadside assistance requests from clients.">

      {/* ── Stats ─────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Active', value: requests.length,
            color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'Pending',
            value: requests.filter(r => r.status === 'pending').length,
            color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'In Progress',
            value: requests.filter(r => r.status !== 'pending').length,
            color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        ].map(({ label, value, color, bg }) => (
          <GlassCard key={label} className={`p-4 ${bg}`}>
            <p className={`font-bold text-2xl ${color}`}>{value}</p>
            <p className="text-white/40 text-xs mt-0.5">{label}</p>
          </GlassCard>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="md" text="Loading emergencies..." />
        </div>
      ) : requests.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30
            flex items-center justify-center">
            <CheckCircle size={28} className="text-emerald-400" />
          </div>
          <p className="text-white font-semibold">No active emergencies</p>
          <p className="text-white/40 text-sm">All clear! No clients need roadside help right now.</p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <GlassCard key={req.id}
              className="p-4 border border-red-500/20">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30
                  flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={18} className="text-red-400 animate-pulse" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                    <div>
                      <p className="text-white font-bold text-sm">{req.client_name}</p>
                      <p className="text-white/40 text-xs">{req.client_phone}</p>
                    </div>
                    <Badge
                      label={STATUS_BADGE[req.status]?.label || req.status}
                      variant={STATUS_BADGE[req.status]?.variant || 'neutral'}
                    />
                  </div>

                  {req.issue_description && (
                    <p className="text-white/70 text-sm mb-2 bg-white/5 rounded-xl p-2.5
                      border border-white/10">
                      "{req.issue_description}"
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3 text-xs text-white/40 mb-3">
                    {req.vehicle_name && (
                      <span className="flex items-center gap-1">
                        <Car size={11} /> {req.vehicle_name} • {req.plate_number}
                      </span>
                    )}
                    {req.latitude && (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} /> {parseFloat(req.latitude).toFixed(4)}, {parseFloat(req.longitude).toFixed(4)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {new Date(req.created_at).toLocaleTimeString('en-KE')}
                    </span>
                  </div>

                  {/* Mini Map */}
                  {req.latitude && req.longitude && (
                    <div className="rounded-xl overflow-hidden mb-3" style={{ height: 140 }}>
                      <MapContainer
                        center={[parseFloat(req.latitude), parseFloat(req.longitude)]}
                        zoom={14} style={{ height: '100%', width: '100%' }}
                        zoomControl={false} scrollWheelZoom={false}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker
                          position={[parseFloat(req.latitude), parseFloat(req.longitude)]}
                          icon={redIcon}>
                          <Popup>{req.client_name}</Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <a href={`tel:${req.client_phone}`}
                      className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400
                        text-xs font-semibold rounded-xl px-3 py-2
                        border border-emerald-500/30 transition-all">
                      <Phone size={13} /> Call Client
                    </a>

                    {req.latitude && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${req.latitude},${req.longitude}`}
                        target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 bg-blue-500/20 text-blue-400
                          text-xs font-semibold rounded-xl px-3 py-2
                          border border-blue-500/30 transition-all">
                        <Navigation size={13} /> Navigate
                      </a>
                    )}

                    {req.status === 'pending' && (
                      <button onClick={() => acceptMutation.mutate(req.id)}
                        disabled={acceptMutation.isPending}
                        className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-indigo-500
                          text-white text-xs font-semibold rounded-xl px-3 py-2
                          transition-all disabled:opacity-50">
                        <CheckCircle size={13} /> Accept Request
                      </button>
                    )}

                    {req.status === 'accepted' && (
                      <button onClick={() => updateMutation.mutate({ id: req.id, status: 'in_progress' })}
                        className="flex items-center gap-1.5 bg-amber-500/20 text-amber-400
                          text-xs font-semibold rounded-xl px-3 py-2
                          border border-amber-500/30 transition-all">
                        <Wrench size={13} /> Mark In Progress
                      </button>
                    )}

                    {(req.status === 'accepted' || req.status === 'in_progress') && (
                      <button onClick={() => updateMutation.mutate({ id: req.id, status: 'resolved' })}
                        className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400
                          text-xs font-semibold rounded-xl px-3 py-2
                          border border-emerald-500/30 transition-all">
                        <CheckCircle size={13} /> Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </PageWrapper>
  );
};

export default EmergencyDashboard;