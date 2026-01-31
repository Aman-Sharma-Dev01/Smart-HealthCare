import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import 'dotenv/config';

// --- Import All Your Routes ---
import authRoutes from './routes/auth.routes.js';
import hospitalRoutes from './routes/hospital.routes.js';
import appointmentRoutes from './routes/appointment.routes.js';
import queueRoutes from './routes/queue.routes.js';
import recordRoutes from './routes/record.routes.js';
import emergencyRoutes from './routes/emergency.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import doctorRoutes from './routes/doctor.routes.js';
import chatRoutes from './routes/chat.routes.js';
import pushRoutes from './routes/push.routes.js';

// --- 1. Initialize Express App ---
const app = express();

// --- 2. Database Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected... 🔗'))
  .catch(err => {
    console.error(`MongoDB Connection Error: ${err.message}`);
    process.exit(1);
  });

// --- 3. Middleware Setup ---
// Production-ready CORS configuration
const allowedOrigins = [process.env.CLIENT_URL, 'http://localhost:5173'];

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Note: The 'uploads' folder is for local storage. This will not work on Render's ephemeral filesystem.
// Google Cloud Storage is the correct approach for production.
app.use('/uploads', express.static('uploads'));

// --- 4. API Routes ---

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queues', queueRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/push', pushRoutes);

// --- 5. HTTP Server & Socket.IO Setup ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.set('socketio', io);

// --- 6. Socket.IO Connection Logic (Single, Combined Handler) ---
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id} 🔌`);

  // Listener for patient queue rooms
  socket.on('join-queue-room', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined queue room: ${roomId}`);
  });
  
  // Listener for hospital-wide emergency rooms
  socket.on('join-hospital-emergency-room', (hospitalId) => {
    const hospitalRoom = `hospital_emergency_${hospitalId}`;
    socket.join(hospitalRoom);
    console.log(`Socket ${socket.id} joined emergency room: ${hospitalRoom}`);
  });

  // Listener for private user notification rooms
  socket.on('join-user-room', (userId) => {
      const userRoom = `user_${userId}`;
      socket.join(userRoom);
      console.log(`Socket ${socket.id} joined private room: ${userRoom}`);
  });

  // Listener for doctor-specific rooms (for personal notifications)
  socket.on('join-doctor-room', (doctorId) => {
      const doctorRoom = `doctor_${doctorId}`;
      socket.join(doctorRoom);
      console.log(`Socket ${socket.id} joined doctor room: ${doctorRoom}`);
  });

  // Handle heartbeat for connection health check
  socket.on('heartbeat', () => {
      socket.emit('heartbeat-ack');
  });

  // Listener for when a user disconnects
  socket.on('disconnect', (reason) => {
    console.log(`User disconnected: ${socket.id} - Reason: ${reason}`);
  });

  // Error handling
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
});

// --- 7. Start the Server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} 🚀`);
});
