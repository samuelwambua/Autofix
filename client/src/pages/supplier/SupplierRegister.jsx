import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Store, User, Phone, Mail, Lock, MapPin, ChevronRight,
  ChevronLeft, CheckCircle, Eye, EyeOff, Navigation,
} from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import useSupplierStore from '../../store/supplierStore';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const SPECIALIZATIONS = [
  'Engine Parts', 'Suspension', 'Electrical', 'Body Parts',
  'Tyres & Rims', 'Batteries', 'Brakes', 'Transmission',
  'German Cars', 'Japanese Cars', 'Commercial Vehicles', 'Accessories',
];

const inputClass = 'w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all';
const labelClass = 'text-white/70 text-sm font-medium mb-1.5 block';

const LocationPicker = ({ onLocationSelect, position }) => {
  useMapEvents({
    click(e) { onLocationSelect(e.latlng); },
  });
  return position ? <Marker position={position} /> : null;
};

const SupplierRegister = () => {
  const navigate = useNavigate();
  const { loginSupplier } = useSupplierStore();
  const [step, setStep]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [showPass, setShowPass]   = useState(false);
  const [locating, setLocating]   = useState(false);
  const [mapPosition, setMapPosition] = useState(null);

  const [form, setForm] = useState({
    business_name: '', owner_name: '', email: '', phone: '', password: '',
    address: '', city: '', latitude: '', longitude: '',
    business_type: 'spare_parts_dealer', specializations: [],
  });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleSpec = (spec) => {
    setForm(prev => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter(s => s !== spec)
        : [...prev.specializations, spec],
    }));
  };

  const getUserLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm(prev => ({ ...prev, latitude, longitude }));
        setMapPosition({ lat: latitude, lng: longitude });
        setLocating(false);
      },
      () => { toast.error('Could not get location.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleMapClick = (latlng) => {
    setMapPosition(latlng);
    setForm(prev => ({ ...prev, latitude: latlng.lat, longitude: latlng.lng }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.post('/supplier/auth/register', form);
      const { supplier, token } = res.data.data;
      loginSupplier(supplier, token);
      toast.success('Registration successful!');
      navigate('/supplier/documents');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, label: 'Business Info' },
    { num: 2, label: 'Location' },
    { num: 3, label: 'Specialization' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-950 to-amber-900
      flex items-center justify-center p-4">

      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl" />

      <div className="w-full max-w-lg relative z-10">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500
            flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
            <Store size={28} className="text-white" />
          </div>
          <h1 className="text-white font-black text-2xl">Join AutoFix Marketplace</h1>
          <p className="text-white/50 text-sm mt-1">Register as a verified spare parts supplier</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold
                transition-all ${step === s.num
                  ? 'bg-orange-500/30 text-orange-300 border border-orange-500/40'
                  : step > s.num
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/5 text-white/30 border border-white/10'
                }`}>
                {step > s.num ? <CheckCircle size={12} /> : <span>{s.num}</span>}
                {s.label}
              </div>
              {i < steps.length - 1 && <div className="w-6 h-px bg-white/20" />}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl">

          {/* ── Step 1: Business Info ── */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-white font-bold text-lg mb-4">Business Information</h2>

              <div>
                <label className={labelClass}>Business Name *</label>
                <div className="relative">
                  <Store size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input placeholder="e.g. Kamau Auto Parts Ltd" value={form.business_name}
                    onChange={(e) => set('business_name', e.target.value)}
                    className={`${inputClass} pl-10`} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Owner Name *</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input placeholder="Your full name" value={form.owner_name}
                    onChange={(e) => set('owner_name', e.target.value)}
                    className={`${inputClass} pl-10`} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Email *</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input type="email" placeholder="email@business.com" value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      className={`${inputClass} pl-10`} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Phone *</label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input placeholder="0712 345 678" value={form.phone}
                      onChange={(e) => set('phone', e.target.value)}
                      className={`${inputClass} pl-10`} />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Password *</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input type={showPass ? 'text' : 'password'} placeholder="Min 6 characters"
                    value={form.password} onChange={(e) => set('password', e.target.value)}
                    className={`${inputClass} pl-10 pr-10`} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className={labelClass}>Business Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'spare_parts_dealer', label: '🔧 Spare Parts Dealer' },
                    { value: 'specialized_dealer', label: '⚙️ Specialized Dealer' },
                  ].map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => set('business_type', opt.value)}
                      className={`p-3 rounded-xl border text-sm font-medium transition-all text-left
                        ${form.business_type === opt.value
                          ? 'bg-orange-500/30 border-orange-500/50 text-orange-200'
                          : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10'
                        }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => {
                  if (!form.business_name || !form.owner_name || !form.email || !form.phone || !form.password)
                    return toast.error('Please fill in all required fields.');
                  if (form.password.length < 6)
                    return toast.error('Password must be at least 6 characters.');
                  setStep(2);
                }}
                className="w-full flex items-center justify-center gap-2
                  bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold
                  rounded-xl py-3 mt-2 shadow-lg shadow-orange-500/30 transition-all">
                Next — Location <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ── Step 2: Location ── */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-white font-bold text-lg mb-4">Business Location</h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>City</label>
                  <input placeholder="Nairobi" value={form.city}
                    onChange={(e) => set('city', e.target.value)}
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Address</label>
                  <input placeholder="e.g. Kirinyaga Road" value={form.address}
                    onChange={(e) => set('address', e.target.value)}
                    className={inputClass} />
                </div>
              </div>

              {/* GPS */}
              <div>
                <label className={labelClass}>GPS Location (tap map or use GPS)</label>
                <div className="flex gap-2 mb-2">
                  <button onClick={getUserLocation} disabled={locating}
                    className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30
                      text-blue-300 text-xs font-semibold rounded-xl px-3 py-2
                      border border-blue-500/30 transition-all">
                    <Navigation size={13} />
                    {locating ? 'Locating...' : 'Use My Location'}
                  </button>
                  {form.latitude && (
                    <span className="flex items-center gap-1 text-emerald-400 text-xs">
                      <CheckCircle size={12} />
                      {parseFloat(form.latitude).toFixed(4)}, {parseFloat(form.longitude).toFixed(4)}
                    </span>
                  )}
                </div>
                <div className="rounded-xl overflow-hidden" style={{ height: 220 }}>
                  <MapContainer
                    center={mapPosition || [-1.2921, 36.8219]}
                    zoom={mapPosition ? 15 : 11}
                    style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <LocationPicker onLocationSelect={handleMapClick} position={mapPosition} />
                  </MapContainer>
                </div>
                <p className="text-white/30 text-xs mt-1">
                  📍 Tap anywhere on the map to set your business location
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20
                    text-white font-semibold rounded-xl py-3 px-5 border border-white/20 transition-all">
                  <ChevronLeft size={16} /> Back
                </button>
                <button onClick={() => setStep(3)}
                  className="flex-1 flex items-center justify-center gap-2
                    bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold
                    rounded-xl py-3 shadow-lg shadow-orange-500/30 transition-all">
                  Next — Specializations <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Specializations ── */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-white font-bold text-lg mb-1">Specializations</h2>
              <p className="text-white/50 text-sm mb-4">
                What types of parts do you deal in? (Select all that apply)
              </p>

              <div className="grid grid-cols-2 gap-2">
                {SPECIALIZATIONS.map(spec => (
                  <button key={spec} type="button" onClick={() => toggleSpec(spec)}
                    className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all
                      ${form.specializations.includes(spec)
                        ? 'bg-orange-500/30 border-orange-500/50 text-orange-200'
                        : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10'
                      }`}>
                    {form.specializations.includes(spec) ? '✓ ' : ''}{spec}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 mt-4">
                <button onClick={() => setStep(2)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20
                    text-white font-semibold rounded-xl py-3 px-5 border border-white/20 transition-all">
                  <ChevronLeft size={16} /> Back
                </button>
                <button onClick={handleSubmit} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2
                    bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold
                    rounded-xl py-3 shadow-lg shadow-orange-500/30 transition-all
                    disabled:opacity-50">
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Registering...</>
                    : <><CheckCircle size={16} /> Complete Registration</>
                  }
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-white/30 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/supplier/login" className="text-orange-400 hover:text-orange-300 font-semibold">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SupplierRegister;