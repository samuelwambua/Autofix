import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Navigation, Star, Wrench, Phone, ChevronRight, X, Filter } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axiosInstance from '../../api/axiosInstance';
import Spinner from '../../components/common/Spinner';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom blue marker for user location
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

// Custom red marker for garages
const garageIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

// Gold marker for selected garage
const selectedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [30, 49], iconAnchor: [15, 49], popupAnchor: [1, -34],
});

// Component to fly map to location
const FlyTo = ({ position, zoom = 13 }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, zoom, { duration: 1.5 });
  }, [position, map, zoom]);
  return null;
};

const StarDisplay = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(s => (
      <Star key={s} size={12}
        className={s <= Math.round(rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />
    ))}
    <span className="text-xs text-gray-500 ml-1">{rating ? parseFloat(rating).toFixed(1) : 'New'}</span>
  </div>
);

const FindGarage = () => {
  const navigate  = useNavigate();
  const [userLocation, setUserLocation]   = useState(null);
  const [garages, setGarages]             = useState([]);
  const [loading, setLoading]             = useState(false);
  const [locating, setLocating]           = useState(false);
  const [selectedGarage, setSelectedGarage] = useState(null);
  const [radius, setRadius]               = useState(20);
  const [mapCenter, setMapCenter]         = useState([-1.2921, 36.8219]); // Default Nairobi
  const [locationError, setLocationError] = useState('');
  const [searchMode, setSearchMode]       = useState('all'); // 'all' or 'nearby'

  // Load all active garages on mount
  useEffect(() => {
    loadAllGarages();
  }, []);

  const loadAllGarages = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/garages');
      setGarages(res.data.data || []);
    } catch (err) {
      console.error('Failed to load garages:', err);
    } finally {
      setLoading(false);
    }
  };

  const getUserLocation = () => {
    setLocating(true);
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setMapCenter([latitude, longitude]);
        setLocating(false);
        loadNearbyGarages(latitude, longitude, radius);
      },
      (err) => {
        setLocationError('Unable to get your location. Please allow location access.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const loadNearbyGarages = async (lat, lng, rad) => {
    setLoading(true);
    setSearchMode('nearby');
    try {
      const res = await axiosInstance.get(`/garages/nearby?lat=${lat}&lng=${lng}&radius=${rad}`);
      setGarages(res.data.data || []);
    } catch (err) {
      console.error('Failed to load nearby garages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRadiusChange = (newRadius) => {
    setRadius(newRadius);
    if (userLocation) {
      loadNearbyGarages(userLocation.lat, userLocation.lng, newRadius);
    }
  };

  const getPlanBadgeColor = (plan) => {
    const colors = { premium: 'bg-amber-100 text-amber-700', basic: 'bg-blue-100 text-blue-700', free: 'bg-gray-100 text-gray-500' };
    return colors[plan] || colors.free;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900">

      {/* ── Top Bar ─────────────────────────────────────── */}
      <div className="bg-white/5 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all">
              <X size={18} />
            </button>
            <div>
              <h1 className="text-white font-bold text-base sm:text-lg">Find a Garage</h1>
              <p className="text-white/40 text-xs">
                {searchMode === 'nearby' && userLocation
                  ? `${garages.length} garages within ${radius}km`
                  : `${garages.length} garages available`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Radius filter — only when nearby mode */}
            {searchMode === 'nearby' && (
              <select
                value={radius}
                onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
                className="bg-white/10 border border-white/20 rounded-xl px-3 py-1.5
                  text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                {[5, 10, 20, 50].map(r => (
                  <option key={r} value={r} className="bg-slate-800">{r}km radius</option>
                ))}
              </select>
            )}

            {/* Find Near Me button */}
            <button
              onClick={getUserLocation}
              disabled={locating}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500
                hover:from-blue-600 hover:to-indigo-600 text-white font-semibold
                rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm shadow-lg
                transition-all disabled:opacity-50 whitespace-nowrap"
            >
              {locating
                ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Locating...</>
                : <><Navigation size={14} />Near Me</>
              }
            </button>

            {/* Show all */}
            {searchMode === 'nearby' && (
              <button onClick={() => { setSearchMode('all'); loadAllGarages(); setUserLocation(null); }}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20
                  text-white/70 font-medium rounded-xl px-3 py-2 text-xs border border-white/20 transition-all">
                Show All
              </button>
            )}
          </div>
        </div>

        {locationError && (
          <p className="text-red-400 text-xs text-center mt-2">{locationError}</p>
        )}
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row h-[calc(100vh-73px)]">

        {/* ── Garage List (left panel) ─────────────────── */}
        <div className="w-full lg:w-96 flex-shrink-0 overflow-y-auto
          bg-white/5 backdrop-blur-xl border-r border-white/10
          max-h-64 lg:max-h-full">

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="md" text="Loading garages..." />
            </div>
          ) : garages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 px-6 text-center">
              <MapPin size={32} className="text-white/20" />
              <p className="text-white/40 text-sm">No garages found in this area.</p>
              <button onClick={() => handleRadiusChange(50)}
                className="text-blue-400 text-xs hover:text-blue-300 transition-colors">
                Try expanding the search radius
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {garages.map((g) => (
                <div
                  key={g.id}
                  onClick={() => { setSelectedGarage(g); setMapCenter([parseFloat(g.latitude), parseFloat(g.longitude)]); }}
                  className={`p-4 cursor-pointer transition-all hover:bg-white/10
                    ${selectedGarage?.id === g.id ? 'bg-blue-500/20 border-l-4 border-blue-500' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-white font-bold text-sm leading-tight">{g.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize flex-shrink-0 ${getPlanBadgeColor(g.subscription_plan)}`}>
                      {g.subscription_plan}
                    </span>
                  </div>

                  <p className="text-white/50 text-xs flex items-center gap-1 mb-1.5">
                    <MapPin size={10} className="flex-shrink-0" />
                    {g.address || g.city}
                    {g.distance_km && (
                      <span className="ml-auto text-blue-300 font-semibold flex-shrink-0">
                        {g.distance_km} km
                      </span>
                    )}
                  </p>

                  <StarDisplay rating={g.average_rating} />

                  {g.specializations?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {g.specializations.slice(0, 3).map((s, i) => (
                        <span key={i} className="text-xs bg-white/10 text-white/60
                          px-2 py-0.5 rounded-full border border-white/10">
                          {s}
                        </span>
                      ))}
                      {g.specializations.length > 3 && (
                        <span className="text-xs text-white/30">+{g.specializations.length - 3} more</span>
                      )}
                    </div>
                  )}

                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/garages/${g.id}`); }}
                    className="mt-3 w-full flex items-center justify-center gap-1.5
                      bg-gradient-to-r from-blue-500 to-indigo-500
                      hover:from-blue-600 hover:to-indigo-600
                      text-white text-xs font-semibold rounded-xl py-2
                      transition-all shadow-lg shadow-blue-500/20"
                  >
                    View & Book <ChevronRight size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Map (right panel) ────────────────────────── */}
        <div className="flex-1 relative">
          <MapContainer
            center={mapCenter}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FlyTo position={mapCenter} zoom={selectedGarage ? 14 : 12} />

            {/* User location marker */}
            {userLocation && (
              <>
                <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                  <Popup>
                    <div className="text-center">
                      <p className="font-bold text-blue-600">📍 Your Location</p>
                    </div>
                  </Popup>
                </Marker>
                <Circle
                  center={[userLocation.lat, userLocation.lng]}
                  radius={radius * 1000}
                  pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.05, weight: 1, dashArray: '5,5' }}
                />
              </>
            )}

            {/* Garage markers */}
            {garages.map((g) => (
              <Marker
                key={g.id}
                position={[parseFloat(g.latitude), parseFloat(g.longitude)]}
                icon={selectedGarage?.id === g.id ? selectedIcon : garageIcon}
                eventHandlers={{ click: () => setSelectedGarage(g) }}
              >
                <Popup maxWidth={260}>
                  <div className="p-1">
                    <p className="font-bold text-gray-800 text-sm mb-1">{g.name}</p>
                    <p className="text-gray-500 text-xs mb-1 flex items-center gap-1">
                      <span>📍</span> {g.address || g.city}
                    </p>
                    {g.distance_km && (
                      <p className="text-blue-600 text-xs font-semibold mb-1">
                        🚗 {g.distance_km} km away
                      </p>
                    )}
                    {g.average_rating && (
                      <p className="text-amber-500 text-xs mb-1">
                        ⭐ {parseFloat(g.average_rating).toFixed(1)} ({g.total_reviews} reviews)
                      </p>
                    )}
                    {g.phone && (
                      <p className="text-gray-500 text-xs mb-2">📞 {g.phone}</p>
                    )}
                    <button
                      onClick={() => navigate(`/garages/${g.id}`)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white
                        text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors"
                    >
                      View & Book Appointment →
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Map legend */}
          <div className="absolute bottom-4 right-4 z-10 bg-white/90 backdrop-blur
            rounded-xl p-3 shadow-lg text-xs space-y-1.5">
            <p className="font-bold text-gray-700 mb-1">Legend</p>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-gray-600">Your Location</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-600">Garage</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-gray-600">Selected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FindGarage;