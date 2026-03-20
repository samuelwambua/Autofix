import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import {
  MapPin, Phone, Mail, Star, Wrench, Calendar,
  ChevronLeft, CheckCircle, Clock, ArrowRight,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axiosInstance from '../../api/axiosInstance';
import useAuthStore from '../../store/authStore';
import Spinner from '../../components/common/Spinner';
import GlassCard from '../../components/common/GlassCard';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const fetchGarageProfile = (id) => axiosInstance.get(`/garages/${id}`).then(r => r.data);

const StarDisplay = ({ rating, size = 16 }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(s => (
      <Star key={s} size={size}
        className={s <= Math.round(rating || 0)
          ? 'text-amber-400 fill-amber-400' : 'text-white/20'} />
    ))}
  </div>
);

const GarageProfile = () => {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['garageProfile', id],
    queryFn: () => fetchGarageProfile(id),
  });

  const handleBookAppointment = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/garages/${id}`, garageId: id } });
      return;
    }
    // Redirect client to their appointments page with garage pre-selected
    navigate('/client/appointments', { state: { garageId: id, garageName: garage?.name } });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900
        flex items-center justify-center">
        <Spinner size="lg" text="Loading garage profile..." />
      </div>
    );
  }

  const garage = data?.data;
  if (!garage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900
        flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl font-bold">Garage not found.</p>
          <button onClick={() => navigate('/find-garage')}
            className="mt-4 text-blue-400 hover:text-blue-300">← Back to map</button>
        </div>
      </div>
    );
  }

  const avgRating    = parseFloat(garage.average_rating || 0);
  const totalReviews = parseInt(garage.total_reviews || 0);
  const rb           = garage.rating_breakdown || {};
  const totalRB      = Object.values(rb).reduce((a, b) => a + parseInt(b || 0), 0);

  const ratingBars = [
    { stars: 5, count: parseInt(rb.five_star  || 0) },
    { stars: 4, count: parseInt(rb.four_star  || 0) },
    { stars: 3, count: parseInt(rb.three_star || 0) },
    { stars: 2, count: parseInt(rb.two_star   || 0) },
    { stars: 1, count: parseInt(rb.one_star   || 0) },
  ];

  const planColors = {
    premium: 'from-amber-500 to-orange-500',
    basic:   'from-blue-500 to-indigo-500',
    free:    'from-slate-500 to-slate-600',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="bg-white/5 backdrop-blur-xl border-b border-white/10 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/find-garage')}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm">
            <ChevronLeft size={18} /> Back to Map
          </button>
          <button
            onClick={handleBookAppointment}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500
              hover:from-blue-600 hover:to-indigo-600 text-white font-semibold
              rounded-xl px-4 py-2 text-sm shadow-lg transition-all"
          >
            <Calendar size={15} /> Book Appointment
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* ── Garage Info Card ─────────────────────────── */}
        <GlassCard className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${planColors[garage.subscription_plan] || planColors.free}
                flex items-center justify-center flex-shrink-0 shadow-lg`}>
                <Wrench size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-xl sm:text-2xl">{garage.name}</h1>
                <p className="text-white/50 text-sm flex items-center gap-1 mt-1">
                  <MapPin size={13} /> {garage.address || garage.city}
                </p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <StarDisplay rating={avgRating} size={14} />
                    <span className="text-white/60 text-xs">
                      {avgRating > 0 ? avgRating.toFixed(1) : 'No ratings yet'}
                      {totalReviews > 0 && ` (${totalReviews} reviews)`}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize
                    bg-white/10 text-white/60`}>
                    {garage.subscription_plan}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {garage.phone && (
                <a href={`tel:${garage.phone}`}
                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors">
                  <Phone size={14} /> {garage.phone}
                </a>
              )}
              {garage.email && (
                <a href={`mailto:${garage.email}`}
                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors">
                  <Mail size={14} /> {garage.email}
                </a>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: 'Jobs Done',   value: garage.total_jobs_completed || 0, icon: CheckCircle, color: 'text-emerald-400' },
              { label: 'Reviews',     value: totalReviews,                      icon: Star,         color: 'text-amber-400' },
              { label: 'Rating',      value: avgRating > 0 ? `${avgRating.toFixed(1)}/5` : 'New', icon: Star, color: 'text-purple-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                <Icon size={18} className={`${color} mx-auto mb-1`} />
                <p className="text-white font-bold text-lg">{value}</p>
                <p className="text-white/40 text-xs">{label}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ── Services ──────────────────────────────────── */}
          <GlassCard className="p-5">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">
              Services Offered
            </p>
            {garage.specializations?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {garage.specializations.map((s, i) => (
                  <span key={i} className="flex items-center gap-1.5 bg-blue-500/20
                    border border-blue-500/30 text-blue-300 text-xs px-3 py-1.5 rounded-xl">
                    <Wrench size={10} /> {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-white/30 text-sm">No services listed yet.</p>
            )}
          </GlassCard>

          {/* ── Rating Breakdown ──────────────────────────── */}
          <GlassCard className="p-5">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">
              Rating Breakdown
            </p>
            {totalReviews === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 gap-2">
                <Star size={24} className="text-white/20" />
                <p className="text-white/30 text-sm">No reviews yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ratingBars.map(({ stars, count }) => (
                  <div key={stars} className="flex items-center gap-3">
                    <span className="text-white/40 text-xs w-4">{stars}</span>
                    <Star size={11} className="text-amber-400 fill-amber-400 flex-shrink-0" />
                    <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-amber-400 h-full rounded-full"
                        style={{ width: totalRB > 0 ? `${(count / totalRB) * 100}%` : '0%' }} />
                    </div>
                    <span className="text-white/40 text-xs w-4 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* ── Mini Map ──────────────────────────────────── */}
        {garage.latitude && garage.longitude && (
          <GlassCard className="p-0 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">Location</p>
              <p className="text-white text-sm mt-0.5">{garage.address || garage.city}</p>
            </div>
            <div style={{ height: 220 }}>
              <MapContainer
                center={[parseFloat(garage.latitude), parseFloat(garage.longitude)]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[parseFloat(garage.latitude), parseFloat(garage.longitude)]}>
                  <Popup>{garage.name}</Popup>
                </Marker>
              </MapContainer>
            </div>
          </GlassCard>
        )}

        {/* ── Recent Reviews ────────────────────────────── */}
        {garage.recent_reviews?.length > 0 && (
          <GlassCard className="p-5">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">
              Recent Reviews
            </p>
            <div className="space-y-4">
              {garage.recent_reviews.map((r, i) => (
                <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-semibold text-sm">{r.client_name}</p>
                    <div className="flex items-center gap-1">
                      <StarDisplay rating={r.rating} size={12} />
                    </div>
                  </div>
                  {r.comment && (
                    <p className="text-white/60 text-sm">"{r.comment}"</p>
                  )}
                  <p className="text-white/25 text-xs mt-1.5">
                    {new Date(r.created_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* ── Book CTA ──────────────────────────────────── */}
        <div className="pb-6">
          <button
            onClick={handleBookAppointment}
            className="w-full flex items-center justify-center gap-3
              bg-gradient-to-r from-blue-500 to-indigo-500
              hover:from-blue-600 hover:to-indigo-600
              text-white font-bold rounded-2xl py-4 text-base
              shadow-xl shadow-blue-500/30 transition-all"
          >
            <Calendar size={20} />
            Book an Appointment at {garage.name}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GarageProfile;