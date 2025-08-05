import express from 'express';
import { createEmergencyAlert, manageEmergency } from '../controllers/emergency.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { multerUpload, uploadToGCS } from '../middleware/upload.middleware.js';

const router = express.Router();

router.post('/alert', protect, multerUpload.single('image'), uploadToGCS, createEmergencyAlert);
router.put('/manage/:emergencyId', protect, manageEmergency); 

export default router;
