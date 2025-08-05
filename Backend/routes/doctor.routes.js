import express from 'express';
import { getDoctorsByHospital, getHospitalDoctors } from '../controllers/doctor.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/my-hospital', protect, getHospitalDoctors);
// --- NEW ROUTE ---
// @desc    Get doctors by a specific hospital name (for patients)
router.get('/by-hospital/:hospitalName', protect, getDoctorsByHospital); // <-- Add this line

export default router;
