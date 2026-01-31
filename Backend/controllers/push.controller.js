import PushSubscription from '../models/pushSubscription.model.js';

/**
 * @desc    Subscribe to push notifications
 * @route   POST /api/push/subscribe
 * @access  Protected
 */
export const subscribe = async (req, res) => {
    const userId = req.user.id;
    const { subscription, deviceInfo } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({ message: 'Invalid subscription object' });
    }

    try {
        // Check if subscription already exists
        let existingSubscription = await PushSubscription.findOne({
            'subscription.endpoint': subscription.endpoint
        });

        if (existingSubscription) {
            // Update existing subscription
            existingSubscription.userId = userId;
            existingSubscription.subscription = subscription;
            existingSubscription.deviceInfo = deviceInfo;
            existingSubscription.isActive = true;
            existingSubscription.lastUsed = new Date();
            await existingSubscription.save();
            
            return res.json({ 
                message: 'Subscription updated successfully',
                subscriptionId: existingSubscription._id
            });
        }

        // Create new subscription
        const newSubscription = new PushSubscription({
            userId,
            subscription,
            deviceInfo
        });

        await newSubscription.save();

        res.status(201).json({ 
            message: 'Subscribed to push notifications successfully',
            subscriptionId: newSubscription._id
        });
    } catch (error) {
        console.error('Push subscribe error:', error);
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

/**
 * @desc    Unsubscribe from push notifications
 * @route   POST /api/push/unsubscribe
 * @access  Protected
 */
export const unsubscribe = async (req, res) => {
    const userId = req.user.id;
    const { endpoint } = req.body;

    try {
        if (endpoint) {
            // Unsubscribe specific endpoint
            await PushSubscription.findOneAndUpdate(
                { 'subscription.endpoint': endpoint },
                { isActive: false }
            );
        } else {
            // Unsubscribe all user's subscriptions
            await PushSubscription.updateMany(
                { userId },
                { isActive: false }
            );
        }

        res.json({ message: 'Unsubscribed from push notifications' });
    } catch (error) {
        console.error('Push unsubscribe error:', error);
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

/**
 * @desc    Get VAPID public key
 * @route   GET /api/push/vapid-public-key
 * @access  Public
 */
export const getVapidPublicKey = async (req, res) => {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    
    if (!vapidPublicKey) {
        return res.status(503).json({ message: 'Push notifications not configured' });
    }

    res.json({ publicKey: vapidPublicKey });
};

/**
 * @desc    Check subscription status
 * @route   GET /api/push/status
 * @access  Protected
 */
export const getSubscriptionStatus = async (req, res) => {
    const userId = req.user.id;

    try {
        const subscriptions = await PushSubscription.find({ 
            userId, 
            isActive: true 
        }).select('deviceInfo createdAt lastUsed');

        res.json({
            isSubscribed: subscriptions.length > 0,
            subscriptionCount: subscriptions.length,
            subscriptions
        });
    } catch (error) {
        console.error('Get subscription status error:', error);
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};
