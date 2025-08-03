import express from 'express';
import { uploadRecord, getMyRecords } from '../controllers/record.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';

const router = express.Router();

router.post('/upload', protect, upload.single('record'), uploadRecord);
router.get('/my-records', protect, getMyRecords);

export default router;