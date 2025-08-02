import express from 'express';
import { getQueueStatus, advanceQueue } from '../controllers/queue.controller.js';
import { protect } from '../middleware/auth.middleware.js';
const router = express.Router();

router.get('/status/:hospitalId', protect, getQueueStatus);
router.put('/next/:queueId', protect, advanceQueue); // Should be protected for admin role

export default router;