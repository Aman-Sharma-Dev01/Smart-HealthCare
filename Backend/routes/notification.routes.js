import express from 'express';
import { getMyHospitalNotifications } from '../controllers/notification.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/my-hospital', protect, getMyHospitalNotifications);

export default router;