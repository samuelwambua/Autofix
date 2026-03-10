import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';

// ─── Auth Pages ───────────────────────────────────────────
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Unauthorized from './pages/auth/Unauthorized';

// ─── Admin Pages ──────────────────────────────────────────
import AdminDashboard from './pages/admin/AdminDashboard';
import StaffManagement from './pages/admin/StaffManagement';
import ClientManagement from './pages/admin/ClientManagement';
import VehicleManagement from './pages/admin/VehicleManagement';
import AppointmentManagement from './pages/admin/AppointmentManagement';

// ─── Placeholder pages (we'll build these next) ───────────
const MechanicDashboard = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 flex items-center justify-center">
    <p className="text-white text-2xl font-bold">Mechanic Dashboard 🔧</p>
  </div>
);
const ReceptionistDashboard = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 flex items-center justify-center">
    <p className="text-white text-2xl font-bold">Receptionist Dashboard 📋</p>
  </div>
);
const ClientDashboard = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 flex items-center justify-center">
    <p className="text-white text-2xl font-bold">Client Dashboard 🚗</p>
  </div>
);

const adminRoles = ['admin', 'supervisor'];

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login"        element={<Login />} />
        <Route path="/register"     element={<Register />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Admin & Supervisor routes */}
        {['/admin', '/supervisor'].map((prefix) => (
          [
            { path: `${prefix}/dashboard`,    element: <AdminDashboard /> },
            { path: `${prefix}/staff`,         element: <StaffManagement /> },
            { path: `${prefix}/clients`,       element: <ClientManagement /> },
            { path: `${prefix}/vehicles`,      element: <VehicleManagement /> },
            { path: `${prefix}/appointments`,  element: <AppointmentManagement /> },
          ].map(({ path, element }) => (
            <Route key={path} path={path} element={
              <ProtectedRoute allowedRoles={adminRoles}>{element}</ProtectedRoute>
            } />
          ))
        ))}

        {/* Mechanic routes */}
        <Route path="/mechanic/dashboard" element={
          <ProtectedRoute allowedRoles={['mechanic']}>
            <MechanicDashboard />
          </ProtectedRoute>
        } />

        {/* Receptionist routes */}
        <Route path="/receptionist/dashboard" element={
          <ProtectedRoute allowedRoles={['receptionist']}>
            <ReceptionistDashboard />
          </ProtectedRoute>
        } />

        {/* Client routes */}
        <Route path="/client/dashboard" element={
          <ProtectedRoute allowedRoles={['client']}>
            <ClientDashboard />
          </ProtectedRoute>
        } />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;