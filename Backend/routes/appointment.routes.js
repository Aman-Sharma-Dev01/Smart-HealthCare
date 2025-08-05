import express from 'express';
import { bookAppointment, bookOfflineAppointment } from '../controllers/appointment.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/book', protect, bookAppointment);
router.post('/offline-booking', protect, bookOfflineAppointment); // New

export default router;
