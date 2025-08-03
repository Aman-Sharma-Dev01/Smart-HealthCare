import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import http from 'http';
import helmet from 'helmet';
import { Server } from 'socket.io';
import 'dotenv/config';
import qaRoutes from './routes/qa.routes.js'; 

console.log('--- Checking Environment Variables ---');
console.log('Value of GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
console.log('------------------------------------');


// --- Import Routes ---
import authRoutes from './routes/auth.routes.js';
import hospitalRoutes from './routes/hospital.routes.js';
import appointmentRoutes from './routes/appointment.routes.js';
import queueRoutes from './routes/queue.routes.js';

// --- 1. CONFIGURATION ---
const config = {
  port: process.env.PORT || 5000,
  mongoURI: process.env.MONGO_URI,
  clientURL: process.env.CLIENT_URL || "http://localhost:3000",
};

if (!config.mongoURI) {
  console.error("FATAL ERROR: MONGO_URI is not defined.");
  process.exit(1);
}

// --- 2. INITIALIZE APP & HTTP SERVER ---
const app = express();
const server = http.createServer(app);

// --- 3. MIDDLEWARE ---
app.use(helmet()); // Set security-related HTTP headers
app.use(cors({ origin: config.clientURL })); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies


// Simple request logger for development
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- 4. DATABASE CONNECTION ---
mongoose.connect(config.mongoURI)
  .then(() => console.log('MongoDB Connected... 🔗'))
  .catch(err => {
    console.error(`MongoDB Connection Error: ${err.message}`);
    process.exit(1);
  });

// --- 5. SOCKET.IO SETUP ---
const io = new Server(server, {
  cors: {
    origin: config.clientURL,
    methods: ['GET', 'POST'],
  },
});

// Make `io` globally accessible in routes via `req.app.get('socketio')`
app.set('socketio', io);

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id} 🔌`);

  socket.on('join-queue-room', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room: ${roomId}`);
  });
  
  socket.on('leave-queue-room', (roomId) => {
    socket.leave(roomId);
    console.log(`Socket ${socket.id} left room: ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// --- 6. API ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queues', queueRoutes);
app.use('/api/ask', qaRoutes);

// --- 7. ERROR HANDLING ---
// Handle 404 - Not Found
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  console.error(`[ERROR] ${statusCode} - ${err.message}`);
  res.status(statusCode).json({
    message: err.message,
    // Provide stack trace only in development
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
});

// --- 8. START SERVER ---
server.listen(config.port, () => {
  console.log(`Server is running on port ${config.port} 🚀`);
});