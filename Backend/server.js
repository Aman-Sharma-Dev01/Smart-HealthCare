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
import chatRoutes from './routes/chat.routes.js'; // <-- NEW

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
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// --- 4. API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queues', queueRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/chat', chatRoutes); // <-- NEW

// --- 5. HTTP Server & Socket.IO Setup ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ['GET', 'POST'],
  },
});

app.set('socketio', io);

// --- 6. Socket.IO Connection Logic ---
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id} 🔌`);

  socket.on('join-queue-room', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined queue room: ${roomId}`);
  });
  
  socket.on('join-hospital-emergency-room', (hospitalId) => {
    const hospitalRoom = `hospital_emergency_${hospitalId}`;
    socket.join(hospitalRoom);
    console.log(`Socket ${socket.id} joined emergency room: ${hospitalRoom}`);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id} 🔌`);

  // --- NEW: Room for individual user notifications ---
  socket.on('join-user-room', (userId) => {
      const userRoom = `user_${userId}`;
      socket.join(userRoom);
      console.log(`Socket ${socket.id} joined private room: ${userRoom}`);
  });

  // ... (existing room logic for queues and hospitals)

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// --- 7. Start the Server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} 🚀`);
});
