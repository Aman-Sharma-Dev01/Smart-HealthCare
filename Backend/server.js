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
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// --- 4. API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queues', queueRoutes);

// --- 5. HTTP Server & Socket.IO Setup ---
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ['GET', 'POST'],
  },
});

// Make `io` accessible in your controllers via `req.app.get('socketio')`
app.set('socketio', io);

// --- 6. Socket.IO Connection Logic ---
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id} 🔌`);

  // Listen for a client to join a specific queue's room
  socket.on('join-queue-room', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room: ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// --- 7. Start the Server ---
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} 🚀`);
});