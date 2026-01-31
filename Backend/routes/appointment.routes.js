import express from 'express';
import { 
    bookAppointment, 
    bookOfflineAppointment, 
    getLatestAppointment,
    getAppointmentHistory,
    getTodaysHospitalAppointments
} from '../controllers/appointment.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/book', protect, bookAppointment);
router.post('/offline-booking', protect, bookOfflineAppointment);

// @desc    Get the logged-in patient's most recent scheduled appointment
router.get('/my-latest', protect, getLatestAppointment);

// @desc    Get the logged-in patient's appointment history
router.get('/my-history', protect, getAppointmentHistory);

router.get('/by-hospital/today', protect, getTodaysHospitalAppointments);


export default router;
