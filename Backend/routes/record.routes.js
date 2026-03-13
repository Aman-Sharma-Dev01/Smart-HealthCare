import express from 'express';
import { uploadRecord, getMyRecords, uploadRecordForPatient } from '../controllers/record.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { multerUpload, uploadToCloudinary } from '../middleware/upload.middleware.js';

const router = express.Router();

router.post('/upload', protect, multerUpload.single('record'), uploadToCloudinary, uploadRecord);

// Doctor uploads record for a patient (sends notification)
router.post('/upload-for-patient', protect, multerUpload.single('record'), uploadToCloudinary, uploadRecordForPatient);

router.get('/my-records', protect, getMyRecords);

export default router;