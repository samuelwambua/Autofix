import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Unauthorized from './pages/auth/Unauthorized';

import AdminDashboard from './pages/admin/AdminDashboard';
import StaffManagement from './pages/admin/StaffManagement';
import ClientManagement from './pages/admin/ClientManagement';
import VehicleManagement from './pages/admin/VehicleManagement';
import AppointmentManagement from './pages/admin/AppointmentManagement';
import JobCardManagement from './pages/admin/JobCardManagement';
import InventoryManagement from './pages/admin/InventoryManagement';
import InvoiceManagement from './pages/admin/InvoiceManagement';
import ReviewManagement    from './pages/admin/ReviewManagement';
import SubscriptionPage    from './pages/admin/SubscriptionPage';

import MechanicDashboard from './pages/mechanic/MechanicDashboard';
import MyJobs from './pages/mechanic/MyJobs';

import SupervisorDashboard from './pages/supervisor/SupervisorDashboard';
import TeamManagement from './pages/supervisor/TeamManagement';
import SupervisorClients from './pages/supervisor/SupervisorClients';
import SupervisorVehicles from './pages/supervisor/SupervisorVehicles';
import SupervisorAppointments from './pages/supervisor/SupervisorAppointments';
import SupervisorJobCards from './pages/supervisor/SupervisorJobCards';
import SupervisorInvoices from './pages/supervisor/SupervisorInvoices';
import SupervisorReviews from './pages/supervisor/SupervisorReviews';

import ClientDashboard from './pages/client/ClientDashboard';

// ─── Public Map Pages ────────────────────────────────────
import FindGarage    from './pages/public/FindGarage';
import GarageProfile from './pages/public/GarageProfile';

// ─── Super Admin Pages ────────────────────────────────────
import SuperAdminLogin     from './pages/super-admin/SuperAdminLogin';
import SuperAdminDashboard       from './pages/super-admin/SuperAdminDashboard';
import SuperAdminSubscriptions   from './pages/super-admin/SuperAdminSubscriptions';
import SuperAdminGarages   from './pages/super-admin/SuperAdminGarages';
import MyVehicles from './pages/client/MyVehicles';
import MyAppointments from './pages/client/MyAppointments';
import MyServiceHistory from './pages/client/MyServiceHistory';
import MyInvoices from './pages/client/MyInvoices';
import MyReviews        from './pages/client/MyReviews';
import MyQuotes         from './pages/client/MyQuotes';
import VehicleProfile   from './pages/client/VehicleProfile';
import SmartReminders   from './pages/client/SmartReminders';
import QuoteManagement  from './pages/admin/QuoteManagement';

const ReceptionistDashboard = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900
    flex items-center justify-center">
    <p className="text-white text-2xl font-bold">Receptionist Dashboard 📋</p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login"        element={<Login />} />
        <Route path="/register"     element={<Register />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Admin */}
        {[
          { path: '/admin/dashboard',    el: <AdminDashboard /> },
          { path: '/admin/staff',        el: <StaffManagement /> },
          { path: '/admin/clients',      el: <ClientManagement /> },
          { path: '/admin/vehicles',     el: <VehicleManagement /> },
          { path: '/admin/appointments', el: <AppointmentManagement /> },
          { path: '/admin/job-cards',    el: <JobCardManagement /> },
          { path: '/admin/inventory',    el: <InventoryManagement /> },
          { path: '/admin/invoices',     el: <InvoiceManagement /> },
          { path: '/admin/reviews',       el: <ReviewManagement /> },
          { path: '/admin/quotes',         el: <QuoteManagement /> },
        ].map(({ path, el }) => (
          <Route key={path} path={path} element={
            <ProtectedRoute allowedRoles={['admin']}>{el}</ProtectedRoute>
          } />
        ))}

        {/* Admin-only standalone routes */}
        <Route path="/admin/subscription" element={
          <ProtectedRoute allowedRoles={['admin']}><SubscriptionPage /></ProtectedRoute>
        } />

        {/* Supervisor */}
        {[
          { path: '/supervisor/dashboard',    el: <SupervisorDashboard /> },
          { path: '/supervisor/team',         el: <TeamManagement /> },
          { path: '/supervisor/clients',      el: <SupervisorClients /> },
          { path: '/supervisor/vehicles',     el: <SupervisorVehicles /> },
          { path: '/supervisor/appointments', el: <SupervisorAppointments /> },
          { path: '/supervisor/job-cards',    el: <SupervisorJobCards /> },
          { path: '/supervisor/invoices',     el: <SupervisorInvoices /> },
          { path: '/supervisor/reviews',      el: <SupervisorReviews /> },
          { path: '/supervisor/quotes',       el: <QuoteManagement /> },
        ].map(({ path, el }) => (
          <Route key={path} path={path} element={
            <ProtectedRoute allowedRoles={['supervisor']}>{el}</ProtectedRoute>
          } />
        ))}

        {/* Mechanic */}
        <Route path="/mechanic/dashboard" element={
          <ProtectedRoute allowedRoles={['mechanic']}><MechanicDashboard /></ProtectedRoute>
        } />
        <Route path="/mechanic/jobs" element={
          <ProtectedRoute allowedRoles={['mechanic']}><MyJobs /></ProtectedRoute>
        } />

        {/* Client */}
        <Route path="/client/dashboard"    element={<ProtectedRoute allowedRoles={['client']}><ClientDashboard /></ProtectedRoute>} />
        <Route path="/client/vehicles"     element={<ProtectedRoute allowedRoles={['client']}><MyVehicles /></ProtectedRoute>} />
        <Route path="/client/appointments" element={<ProtectedRoute allowedRoles={['client']}><MyAppointments /></ProtectedRoute>} />
        <Route path="/client/jobs"         element={<ProtectedRoute allowedRoles={['client']}><MyServiceHistory /></ProtectedRoute>} />
        <Route path="/client/invoices"     element={<ProtectedRoute allowedRoles={['client']}><MyInvoices /></ProtectedRoute>} />
        <Route path="/client/reviews"      element={<ProtectedRoute allowedRoles={['client']}><MyReviews /></ProtectedRoute>} />
        <Route path="/client/quotes"       element={<ProtectedRoute allowedRoles={['client']}><MyQuotes /></ProtectedRoute>} />
        <Route path="/client/vehicles/:id"  element={<ProtectedRoute allowedRoles={['client']}><VehicleProfile /></ProtectedRoute>} />
        <Route path="/client/reminders"      element={<ProtectedRoute allowedRoles={['client']}><SmartReminders /></ProtectedRoute>} />

        {/* Receptionist */}
        <Route path="/receptionist/dashboard" element={
          <ProtectedRoute allowedRoles={['receptionist']}><ReceptionistDashboard /></ProtectedRoute>
        } />

        {/* Public Map Routes — no auth needed */}
        <Route path="/find-garage"    element={<FindGarage />} />
        <Route path="/garages/:id"    element={<GarageProfile />} />

        {/* Super Admin */}
        <Route path="/super-admin/login" element={<SuperAdminLogin />} />
        <Route path="/super-admin/dashboard" element={
          <ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>
        } />
        <Route path="/super-admin/garages" element={
          <ProtectedRoute allowedRoles={['super_admin']}><SuperAdminGarages /></ProtectedRoute>
        } />
        <Route path="/super-admin/subscriptions" element={
          <ProtectedRoute allowedRoles={['super_admin']}><SuperAdminSubscriptions /></ProtectedRoute>
        } />

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;