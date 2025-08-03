import express from 'express';
import { createEmergencyAlert } from '../controllers/emergency.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';

const router = express.Router();

router.post('/alert', protect, upload.single('image'), createEmergencyAlert);

export default router;