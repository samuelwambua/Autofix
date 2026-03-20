const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const dotenv  = require('dotenv');

dotenv.config();

const { connectDB }       = require('./config/db');
const { garageScope }     = require('./middleware/authMiddleware');
const { checkSubscription } = require('./middleware/subscriptionMiddleware');
const authRoutes          = require('./routes/authRoutes');
const clientRoutes        = require('./routes/clientRoutes');
const staffRoutes         = require('./routes/staffRoutes');
const vehicleRoutes       = require('./routes/vehicleRoutes');
const appointmentRoutes   = require('./routes/appointmentRoutes');
const jobCardRoutes       = require('./routes/jobCardRoutes');
const inventoryRoutes     = require('./routes/inventoryRoutes');
const reviewRoutes        = require('./routes/reviewRoutes');
const notificationRoutes  = require('./routes/notificationRoutes');
const invoiceRoutes       = require('./routes/invoiceRoutes');
const dashboardRoutes     = require('./routes/dashboardRoutes');
const supervisorRoutes    = require('./routes/supervisorRoutes');
const superAdminRoutes    = require('./routes/superAdminRoutes');
const garageRoutes        = require('./routes/garageRoutes');
const subscriptionRoutes   = require('./routes/subscriptionRoutes');
const mpesaRoutes          = require('./routes/mpesaRoutes');

connectDB();

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => res.json({ success: true, message: 'AutoFix API is running...' }));

// ─── Public / Auth Routes (no garage scope needed) ────────
app.use('/api/auth',        authRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/garages',     garageRoutes);

// ─── Garage-Scoped Routes ─────────────────────────────────
// garageScope + checkSubscription ensures data isolation and plan enforcement
// Apply subscription check to all garage-scoped routes
app.use('/api/clients',       checkSubscription, clientRoutes);
app.use('/api/staff',         checkSubscription, staffRoutes);
app.use('/api/vehicles',      checkSubscription, vehicleRoutes);
app.use('/api/appointments',  checkSubscription, appointmentRoutes);
app.use('/api/job-cards',     checkSubscription, jobCardRoutes);
app.use('/api/inventory',     checkSubscription, inventoryRoutes);
app.use('/api/reviews',       checkSubscription, reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/invoices',      checkSubscription, invoiceRoutes);
app.use('/api/dashboard',     checkSubscription, dashboardRoutes);
app.use('/api/supervisor',    checkSubscription, supervisorRoutes);
app.use('/api/subscription',   subscriptionRoutes);
app.use('/api/mpesa',          mpesaRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ AutoFix server running on port ${PORT}`));