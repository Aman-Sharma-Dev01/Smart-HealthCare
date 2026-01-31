import express from 'express';
import { getQueueStatus, advanceQueue, getMyQueue, markAppointmentInQueue, getQueueByDate } from '../controllers/queue.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// The route now uses doctorId to fetch the queue status
router.get('/status/:doctorId', protect, getQueueStatus); // <-- UPDATED

router.put('/next/:queueId', protect, advanceQueue);

// Mark appointment as completed/missed
router.put('/mark-appointment/:appointmentId', protect, markAppointmentInQueue);

// --- NEW ROUTE ---
// @desc    Get the logged-in doctor's queue for the day
router.get('/my-queue', protect, getMyQueue);

// Get queue for a specific date
router.get('/my-queue/:date', protect, getQueueByDate);

export default router;