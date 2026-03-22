import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, MapPin, Navigation, Phone,
  CheckCircle, X, Clock, Car, Wrench,
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
import Modal from '../../components/common/Modal';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const fetchMyVehicles  = () => axiosInstance.get('/vehicles/my-vehicles').then(r => r.data);
const fetchMyRequests  = () => axiosInstance.get('/emergency/my').then(r => r.data);

const STATUS_BADGE = {
  pending:     { variant: 'warning', label: 'Pending' },
  accepted:    { variant: 'info',    label: 'Accepted' },
  in_progress: { variant: 'success', label: 'In Progress' },
  resolved:    { variant: 'success', label: 'Resolved' },
  cancelled:   { variant: 'neutral', label: 'Cancelled' },
};

const EmergencyPage = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm]           = useState(false);
  const [locating, setLocating]           = useState(false);
  const [location, setLocation]           = useState(null);
  const [locationError, setLocationError] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [issueDesc, setIssueDesc]         = useState('');
  const [address, setAddress]             = useState('');
  const [activeRequest, setActiveRequest] = useState(null);

  const { data: vehiclesData }  = useQuery({ queryKey: ['myVehicles'], queryFn: fetchMyVehicles });
  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['myEmergencyRequests'],
    queryFn: fetchMyRequests,
    refetchInterval: 15000,
  });

  const vehicles = vehiclesData?.data || [];
  const requests = requestsData?.data || [];
  const activeReq = requests.find(r => ['pending', 'accepted', 'in_progress'].includes(r.status));

  const createMutation = useMutation({
    mutationFn: (data) => axiosInstance.post('/emergency', data).then(r => r.data),
    onSuccess: (d) => {
      toast.success(d.message);
      queryClient.invalidateQueries(['myEmergencyRequests']);
      setShowForm(false);
      setIssueDesc('');
      setSelectedVehicle('');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to send request.'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => axiosInstance.put(`/emergency/${id}/cancel`).then(r => r.data),
    onSuccess: () => {
      toast.success('Emergency request cancelled.');
      queryClient.invalidateQueries(['myEmergencyRequests']);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const getLocation = () => {
    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocationError('Could not get your location. Please enable location access.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = () => {
    if (!location) {
      toast.error('Please share your location first.');
      return;
    }
    createMutation.mutate({
      vehicle_id:        selectedVehicle || null,
      latitude:          location.lat,
      longitude:         location.lng,
      address:           address || null,
      issue_description: issueDesc || null,
    });
  };

  return (
    <PageWrapper title="Emergency Assistance" subtitle="Request immediate roadside help from nearby garages.">

      {/* ── Active Emergency Alert ───────────────────── */}
      {activeReq && (
        <div className="mb-6 bg-red-500/20 border border-red-500/40 rounded-2xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/30 flex items-center
              justify-center flex-shrink-0">
              <AlertTriangle size={18} className="text-red-300 animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="text-red-200 font-bold">Active Emergency Request</p>
              <p className="text-red-300/70 text-sm mt-0.5">
                {activeReq.status === 'pending'
                  ? 'Waiting for a garage to accept your request...'
                  : activeReq.status === 'accepted'
                  ? `${activeReq.garage_name} has accepted — help is on the way!`
                  : 'Help is in progress.'
                }
              </p>
            </div>
            <Badge
              label={STATUS_BADGE[activeReq.status]?.label || activeReq.status}
              variant={STATUS_BADGE[activeReq.status]?.variant || 'neutral'}
            />
          </div>

          {activeReq.garage_name && (
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 mb-3">
              <Wrench size={14} className="text-emerald-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-white text-sm font-semibold">{activeReq.garage_name}</p>
                {activeReq.garage_phone && (
                  <p className="text-white/40 text-xs">{activeReq.garage_phone}</p>
                )}
              </div>
              {activeReq.garage_phone && (
                <a href={`tel:${activeReq.garage_phone}`}
                  className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400
                    text-xs font-semibold rounded-xl px-3 py-1.5 border border-emerald-500/30">
                  <Phone size={12} /> Call
                </a>
              )}
            </div>
          )}

          {activeReq.status === 'pending' && (
            <button onClick={() => cancelMutation.mutate(activeReq.id)}
              disabled={cancelMutation.isPending}
              className="w-full bg-white/10 hover:bg-white/20 text-white/70
                font-semibold rounded-xl py-2 text-sm border border-white/20 transition-all">
              Cancel Request
            </button>
          )}
        </div>
      )}

      {/* ── SOS Button ──────────────────────────────── */}
      {!activeReq && (
        <div className="flex flex-col items-center justify-center py-8 mb-6">
          <button onClick={() => { setShowForm(true); getLocation(); }}
            className="w-48 h-48 rounded-full bg-gradient-to-br from-red-500 to-rose-600
              hover:from-red-600 hover:to-rose-700 text-white font-black text-4xl
              shadow-2xl shadow-red-500/50 transition-all active:scale-95
              flex flex-col items-center justify-center gap-2
              border-4 border-red-400/30">
            <AlertTriangle size={40} />
            <span className="text-xl font-black tracking-widest">SOS</span>
          </button>
          <p className="text-white/40 text-sm mt-4 text-center">
            Tap to request immediate roadside assistance
          </p>
        </div>
      )}

      {/* ── Past Requests ────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size="sm" text="Loading requests..." />
        </div>
      ) : requests.length > 0 && (
        <GlassCard className="p-5">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">
            Request History
          </p>
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="flex items-start gap-3 p-3
                bg-white/5 rounded-xl border border-white/10">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                  ${req.status === 'resolved' ? 'bg-emerald-500/20' :
                    req.status === 'pending' ? 'bg-amber-500/20' : 'bg-white/10'}`}>
                  <AlertTriangle size={14} className={
                    req.status === 'resolved' ? 'text-emerald-400' :
                    req.status === 'pending'  ? 'text-amber-400'   : 'text-white/40'
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-white text-sm font-medium truncate">
                      {req.issue_description || 'Emergency Request'}
                    </p>
                    <Badge
                      label={STATUS_BADGE[req.status]?.label || req.status}
                      variant={STATUS_BADGE[req.status]?.variant || 'neutral'}
                    />
                  </div>
                  {req.garage_name && (
                    <p className="text-white/40 text-xs">Garage: {req.garage_name}</p>
                  )}
                  {req.vehicle_name && (
                    <p className="text-white/30 text-xs">{req.vehicle_name} • {req.plate_number}</p>
                  )}
                  <p className="text-white/25 text-xs">
                    {new Date(req.created_at).toLocaleDateString('en-KE', {
                      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ── Emergency Request Form Modal ─────────────── */}
      {showForm && (
        <Modal isOpen={showForm} onClose={() => setShowForm(false)}
          title="Request Emergency Help" size="md">
          <div className="space-y-4">

            {/* Location Status */}
            <div className={`p-3 rounded-xl border flex items-center gap-3
              ${location
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/20'
              }`}>
              <MapPin size={16} className={location ? 'text-emerald-400' : 'text-amber-400'} />
              <div className="flex-1">
                {locating ? (
                  <p className="text-white/60 text-sm">Getting your location...</p>
                ) : location ? (
                  <p className="text-emerald-300 text-sm font-medium">
                    ✓ Location captured ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
                  </p>
                ) : (
                  <p className="text-amber-300 text-sm">Location not captured yet</p>
                )}
                {locationError && <p className="text-red-400 text-xs mt-0.5">{locationError}</p>}
              </div>
              {!location && !locating && (
                <button onClick={getLocation}
                  className="flex items-center gap-1.5 bg-blue-500/20 text-blue-300
                    text-xs font-semibold rounded-xl px-3 py-1.5 border border-blue-500/30">
                  <Navigation size={12} /> Get Location
                </button>
              )}
            </div>

            {/* Map preview */}
            {location && (
              <div className="rounded-xl overflow-hidden" style={{ height: 160 }}>
                <MapContainer center={[location.lat, location.lng]} zoom={15}
                  style={{ height: '100%', width: '100%' }} zoomControl={false}
                  scrollWheelZoom={false}>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  <Marker position={[location.lat, location.lng]}>
                    <Popup>Your Location</Popup>
                  </Marker>
                </MapContainer>
              </div>
            )}

            {/* Address */}
            <div>
              <label className="text-white/60 text-xs font-medium mb-1 block">
                Address / Landmark (optional)
              </label>
              <input placeholder="e.g. Near Shell petrol station, Ngong Road"
                value={address} onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5
                  text-white placeholder-white/30 text-sm focus:outline-none
                  focus:ring-2 focus:ring-red-500/50" />
            </div>

            {/* Vehicle */}
            {vehicles.length > 0 && (
              <div>
                <label className="text-white/60 text-xs font-medium mb-1 block">
                  Which vehicle? (optional)
                </label>
                <select value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5
                    text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50">
                  <option value="" className="bg-slate-800">Select vehicle</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id} className="bg-slate-800">
                      {v.make} {v.model} — {v.plate_number}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Issue description */}
            <div>
              <label className="text-white/60 text-xs font-medium mb-1 block">
                What's the problem? (optional)
              </label>
              <textarea rows={2}
                placeholder="e.g. Car won't start, flat tyre, engine overheating..."
                value={issueDesc} onChange={(e) => setIssueDesc(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5
                  text-white placeholder-white/30 text-sm focus:outline-none
                  focus:ring-2 focus:ring-red-500/50 resize-none" />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                  rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                Cancel
              </button>
              <button onClick={handleSubmit}
                disabled={createMutation.isPending || !location}
                className="flex-1 bg-gradient-to-r from-red-500 to-rose-500
                  hover:from-red-600 hover:to-rose-600 text-white font-bold
                  rounded-xl py-2.5 text-sm transition-all disabled:opacity-50
                  flex items-center justify-center gap-2 shadow-lg shadow-red-500/30">
                {createMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending...</>
                  : <><AlertTriangle size={15} /> Send Emergency Request</>
                }
              </button>
            </div>
          </div>
        </Modal>
      )}
    </PageWrapper>
  );
};

export default EmergencyPage;