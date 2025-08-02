import express from 'express';
import { getNearbyHospitals } from '../controllers/hospital.controller.js';
const router = express.Router();

router.get('/nearby', getNearbyHospitals);

export default router;