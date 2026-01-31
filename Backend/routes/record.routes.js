import express from 'express';
import { uploadRecord, getMyRecords, uploadRecordForPatient } from '../controllers/record.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { multerUpload, uploadToGCS } from '../middleware/upload.middleware.js'; // <-- IMPORT NEW MIDDLEWARE

const router = express.Router();

// The route now uses two middleware: one for multer, one for GCS upload
router.post('/upload', protect, multerUpload.single('record'), uploadToGCS, uploadRecord); // <-- UPDATED

// Doctor uploads record for a patient (sends notification)
router.post('/upload-for-patient', protect, multerUpload.single('record'), uploadToGCS, uploadRecordForPatient);

router.get('/my-records', protect, getMyRecords);

export default router;