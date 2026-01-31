import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
    subscribe,
    unsubscribe,
    getVapidPublicKey,
    getSubscriptionStatus
} from '../controllers/push.controller.js';

const router = express.Router();

// Public route - get VAPID public key
router.get('/vapid-public-key', getVapidPublicKey);

// Protected routes
router.post('/subscribe', protect, subscribe);
router.post('/unsubscribe', protect, unsubscribe);
router.get('/status', protect, getSubscriptionStatus);

export default router;
