import express from 'express';
import { 
    bookAppointment, 
    bookOfflineAppointment, 
    getLatestAppointment,
    getAppointmentHistory,
    getTodaysHospitalAppointments,
    markAppointmentStatus,
    submitFeedback,
    rescheduleAppointment,
    getAppointmentDetails,
    cancelAppointment,
    bookAppointmentForDate
} from '../controllers/appointment.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/book', protect, bookAppointment);
router.post('/book-date', protect, bookAppointmentForDate);
router.post('/offline-booking', protect, bookOfflineAppointment);

// @desc    Get the logged-in patient's most recent scheduled appointment
router.get('/my-latest', protect, getLatestAppointment);

// @desc    Get the logged-in patient's appointment history
router.get('/my-history', protect, getAppointmentHistory);

router.get('/by-hospital/today', protect, getTodaysHospitalAppointments);

// Appointment actions
router.get('/:appointmentId', protect, getAppointmentDetails);
router.put('/:appointmentId/status', protect, markAppointmentStatus);
router.put('/:appointmentId/reschedule', protect, rescheduleAppointment);
router.put('/:appointmentId/cancel', protect, cancelAppointment);
router.post('/:appointmentId/feedback', protect, submitFeedback);

export default router;
