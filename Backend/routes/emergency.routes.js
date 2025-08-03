import express from 'express';
import { createEmergencyAlert } from '../controllers/emergency.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { multerUpload, uploadToGCS } from '../middleware/upload.middleware.js'; // <-- IMPORT NEW MIDDLEWARE

const router = express.Router();

// The route now uses two middleware: one for multer, one for GCS upload
router.post('/alert', protect, multerUpload.single('image'), uploadToGCS, createEmergencyAlert); // <-- UPDATED

export default router;