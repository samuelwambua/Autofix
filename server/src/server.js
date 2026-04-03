const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const dotenv    = require('dotenv');
const http      = require('http');
const { Server } = require('socket.io');

dotenv.config();

const { connectDB, pool }       = require('./config/db');
const { garageScope }           = require('./middleware/authMiddleware');
const { checkSubscription }     = require('./middleware/subscriptionMiddleware');
const authRoutes                = require('./routes/authRoutes');
const clientRoutes              = require('./routes/clientRoutes');
const staffRoutes               = require('./routes/staffRoutes');
const vehicleRoutes             = require('./routes/vehicleRoutes');
const appointmentRoutes         = require('./routes/appointmentRoutes');
const jobCardRoutes             = require('./routes/jobCardRoutes');
const inventoryRoutes           = require('./routes/inventoryRoutes');
const reviewRoutes              = require('./routes/reviewRoutes');
const notificationRoutes        = require('./routes/notificationRoutes');
const invoiceRoutes             = require('./routes/invoiceRoutes');
const dashboardRoutes           = require('./routes/dashboardRoutes');
const supervisorRoutes          = require('./routes/supervisorRoutes');
const superAdminRoutes          = require('./routes/superAdminRoutes');
const garageRoutes              = require('./routes/garageRoutes');
const subscriptionRoutes        = require('./routes/subscriptionRoutes');
const mpesaRoutes               = require('./routes/mpesaRoutes');
const quoteRoutes               = require('./routes/quoteRoutes');
const vehicleEnhancedRoutes     = require('./routes/vehicleEnhancedRoutes');
const reminderRoutes            = require('./routes/reminderRoutes');
const chatRoutes                = require('./routes/chatRoutes');
const emergencyRoutes           = require('./routes/emergencyRoutes');
const supplierAuthRoutes        = require('./routes/supplierAuthRoutes');
const warrantyRoutes            = require('./routes/warrantyRoutes');
const loyaltyRoutes             = require('./routes/loyaltyRoutes');

connectDB();

const app    = express();
const server = http.createServer(app);

// ─── Socket.io Setup ──────────────────────────────────────
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Store active socket connections
const connectedUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  // Register user
  socket.on('register', (userId) => {
    connectedUsers.set(userId, socket.id);
    socket.userId = userId;
    console.log(`👤 User ${userId} registered on socket ${socket.id}`);
  });

  // Join conversation room
  socket.on('join_conversation', (conversationId) => {
    socket.join(`conv_${conversationId}`);
  });

  // Leave conversation room
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conv_${conversationId}`);
  });

  // Send message via socket
  socket.on('send_message', async (data) => {
    try {
      const { conversation_id, sender_id, sender_type, content, message_type = 'text' } = data;

      // Save message to DB
      const result = await pool.query(
        `INSERT INTO messages (conversation_id, sender_id, sender_type, message_type, content)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [conversation_id, sender_id, sender_type, message_type, content]
      );

      const message = result.rows[0];

      // Update conversation
      const unreadField = sender_type === 'client' ? 'garage_unread' : 'client_unread';
      await pool.query(
        `UPDATE conversations SET last_message = $1, last_message_at = NOW(),
           ${unreadField} = ${unreadField} + 1, updated_at = NOW()
         WHERE id = $2`,
        [content.substring(0, 100), conversation_id]
      );

      // Broadcast to conversation room
      io.to(`conv_${conversation_id}`).emit('new_message', message);

      // Notify recipient if online
      const conv = await pool.query('SELECT * FROM conversations WHERE id = $1', [conversation_id]);
      if (conv.rows.length > 0) {
        const recipientId = sender_type === 'client'
          ? conv.rows[0].garage_id  // notify garage staff
          : conv.rows[0].client_id; // notify client

        const recipientSocket = connectedUsers.get(recipientId);
        if (recipientSocket) {
          io.to(recipientSocket).emit('message_notification', {
            conversation_id,
            message,
          });
        }
      }
    } catch (error) {
      console.error('Socket send_message error:', error.message);
      socket.emit('error', { message: 'Failed to send message.' });
    }
  });

  // Typing indicator
  socket.on('typing', (data) => {
    socket.to(`conv_${data.conversation_id}`).emit('user_typing', {
      sender_id:   data.sender_id,
      sender_type: data.sender_type,
    });
  });

  socket.on('stop_typing', (data) => {
    socket.to(`conv_${data.conversation_id}`).emit('user_stop_typing', {
      sender_id: data.sender_id,
    });
  });

  // Emergency location sharing
  socket.on('share_location', (data) => {
    const { emergency_id, latitude, longitude } = data;
    io.emit(`emergency_location_${emergency_id}`, { latitude, longitude });
  });

  socket.on('disconnect', () => {
    if (socket.userId) connectedUsers.delete(socket.userId);
    console.log('🔌 Socket disconnected:', socket.id);
  });
});

// Make io accessible in controllers
app.set('io', io);
app.set('connectedUsers', connectedUsers);

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => res.json({ success: true, message: 'AutoFix API is running...' }));

// ─── Public / Auth Routes ─────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/garages',     garageRoutes);

// ─── Garage-Scoped Routes ─────────────────────────────────
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
app.use('/api/subscription',  subscriptionRoutes);
app.use('/api/mpesa',         mpesaRoutes);
app.use('/api/quotes',        quoteRoutes);
app.use('/api/vehicles-enhanced', vehicleEnhancedRoutes);
app.use('/api/reminders',     reminderRoutes);
app.use('/api/chat',          chatRoutes);
app.use('/api/emergency',     emergencyRoutes);
app.use('/api/warranties',    warrantyRoutes);
app.use('/api/loyalty',       loyaltyRoutes);
app.use('/api/supplier/auth',  supplierAuthRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ AutoFix server running on port ${PORT}`));