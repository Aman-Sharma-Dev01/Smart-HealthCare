import express from 'express';
import { bookAppointment } from '../controllers/appointment.controller.js';
import { protect } from '../middleware/auth.middleware.js';
const router = express.Router();

router.post('/book', protect, bookAppointment);

export default router;