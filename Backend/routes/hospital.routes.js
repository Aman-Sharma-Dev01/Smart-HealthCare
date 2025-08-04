import express from 'express';
import { getHospitalByName, getNearbyHospitals } from '../controllers/hospital.controller.js';
import { protect } from '../middleware/auth.middleware.js';
const router = express.Router();

router.get('/nearby', getNearbyHospitals);

// --- NEW ROUTE ---
// @desc    Get a hospital's details by its name
router.get('/by-name/:name', protect, getHospitalByName); // <-- Add this line

export default router;