const express = require('express');
const router  = express.Router();
const {
  getSupervisorDashboard,
  getMyTeam,
  addMechanicToTeam,
  removeMechanicFromTeam,
  getMyClients,
  addClientToSupervision,
  getMyJobCards,
  getMyInvoices,
  getUnassignedMechanics,
  getUnassignedClients,
  createMechanic,
  updateMechanic,
  toggleMechanicStatus,
  deleteMechanic,
  createClient,
  updateClient,
  toggleClientStatus,
  deleteClient,
  getMyVehicles,
  getMyAppointments,
  getMyReviews,
} = require('../controllers/supervisorController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('supervisor'));

// ─── Dashboard ────────────────────────────────────────────
router.get('/dashboard',                     getSupervisorDashboard);

// ─── Team Management ──────────────────────────────────────
router.get('/team',                          getMyTeam);
router.get('/team/unassigned',               getUnassignedMechanics);
router.post('/team/add',                     addMechanicToTeam);
router.delete('/team/:mechanicId/remove',    removeMechanicFromTeam);

// ─── Mechanic CRUD ────────────────────────────────────────
router.post('/team/create',                  createMechanic);
router.put('/team/:mechanicId',              updateMechanic);
router.put('/team/:mechanicId/toggle',       toggleMechanicStatus);
router.delete('/team/:mechanicId',           deleteMechanic);

// ─── Client Management ────────────────────────────────────
router.get('/clients',                       getMyClients);
router.get('/clients/unassigned',            getUnassignedClients);
router.post('/clients/add',                  addClientToSupervision);

// ─── Client CRUD ──────────────────────────────────────────
router.post('/clients/create',               createClient);
router.put('/clients/:clientId',             updateClient);
router.put('/clients/:clientId/toggle',      toggleClientStatus);
router.delete('/clients/:clientId',          deleteClient);

// ─── Vehicles ─────────────────────────────────────────────
router.get('/vehicles',                      getMyVehicles);

// ─── Appointments ─────────────────────────────────────────
router.get('/appointments',                  getMyAppointments);

// ─── Reviews ──────────────────────────────────────────────
router.get('/reviews',                       getMyReviews);

// ─── Jobs & Invoices ──────────────────────────────────────
router.get('/job-cards',                     getMyJobCards);
router.get('/invoices',                      getMyInvoices);

module.exports = router;