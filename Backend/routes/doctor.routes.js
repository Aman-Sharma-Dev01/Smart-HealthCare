import express from 'express';
import { getHospitalDoctors } from '../controllers/doctor.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/my-hospital', protect, getHospitalDoctors);

export default router;
