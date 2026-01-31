import express from 'express';
import { 
    getDoctorsByHospital, 
    getHospitalDoctors,
    getDoctorProfile,
    updateDoctorProfile,
    toggleOnlineStatus,
    toggleTodayAvailability,
    setAvailableDates,
    getAvailableDates,
    getDoctorAppointmentHistory,
    checkProfileStatus
} from '../controllers/doctor.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/my-hospital', protect, getHospitalDoctors);

// Doctor profile routes
router.get('/profile', protect, checkProfileStatus); // Main profile endpoint
router.get('/profile/status', protect, checkProfileStatus);
router.put('/profile/update', protect, updateDoctorProfile);
router.put('/profile/toggle-online', protect, toggleOnlineStatus);
router.put('/profile/toggle-today', protect, toggleTodayAvailability);
router.put('/profile/set-dates', protect, setAvailableDates);
router.get('/profile/history', protect, getDoctorAppointmentHistory);
router.get('/appointment-history', protect, getDoctorAppointmentHistory); // Alias route

// Public routes for patients
router.get('/by-hospital/:hospitalName', protect, getDoctorsByHospital);
router.get('/available-dates/:doctorId', protect, getAvailableDates);
router.get('/:doctorId', protect, getDoctorProfile);

export default router;
