import { BACKEND_API_URL } from '../util';

/**
 * Push Notification Manager for PWA
 * Handles subscription, permission, and notification management
 */

// Check if push notifications are supported
export const isPushSupported = () => {
    return 'serviceWorker' in navigator && 
           'PushManager' in window && 
           'Notification' in window;
};

// Get current notification permission status
export const getNotificationPermission = () => {
    if (!isPushSupported()) return 'unsupported';
    return Notification.permission;
};

// Request notification permission
export const requestNotificationPermission = async () => {
    if (!isPushSupported()) {
        console.log('[Push] Push notifications not supported');
        return 'unsupported';
    }

    const permission = await Notification.requestPermission();
    console.log('[Push] Permission:', permission);
    return permission;
};

// Get VAPID public key from server
export const getVapidPublicKey = async () => {
    try {
        const response = await fetch(`${BACKEND_API_URL}/push/vapid-public-key`);
        if (!response.ok) {
            throw new Error('Failed to get VAPID key');
        }
        const data = await response.json();
        return data.publicKey;
    } catch (error) {
        console.error('[Push] Failed to get VAPID key:', error);
        return null;
    }
};

// Convert VAPID key to Uint8Array
const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

// Subscribe to push notifications
export const subscribeToPush = async (token) => {
    if (!isPushSupported()) {
        console.log('[Push] Push notifications not supported');
        return { success: false, reason: 'unsupported' };
    }

    try {
        // Request permission first
        const permission = await requestNotificationPermission();
        if (permission !== 'granted') {
            console.log('[Push] Permission denied');
            return { success: false, reason: 'permission_denied' };
        }

        // Get VAPID public key
        const vapidPublicKey = await getVapidPublicKey();
        if (!vapidPublicKey) {
            console.log('[Push] VAPID key not available');
            return { success: false, reason: 'vapid_unavailable' };
        }

        // Get service worker registration
        const registration = await navigator.serviceWorker.ready;

        // Check for existing subscription
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
            // Create new subscription
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });
            console.log('[Push] New subscription created');
        } else {
            console.log('[Push] Using existing subscription');
        }

        // Send subscription to server
        const response = await fetch(`${BACKEND_API_URL}/push/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                subscription: subscription.toJSON(),
                deviceInfo: {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform
                }
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save subscription on server');
        }

        const data = await response.json();
        console.log('[Push] Subscription saved:', data);
        
        return { success: true, subscription };
    } catch (error) {
        console.error('[Push] Subscribe error:', error);
        return { success: false, reason: 'error', error: error.message };
    }
};

// Unsubscribe from push notifications
export const unsubscribeFromPush = async (token) => {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            await subscription.unsubscribe();
            
            // Notify server
            await fetch(`${BACKEND_API_URL}/push/unsubscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    endpoint: subscription.endpoint
                })
            });

            console.log('[Push] Unsubscribed successfully');
            return { success: true };
        }

        return { success: true, message: 'No subscription found' };
    } catch (error) {
        console.error('[Push] Unsubscribe error:', error);
        return { success: false, error: error.message };
    }
};

// Check if user is subscribed
export const isSubscribed = async () => {
    if (!isPushSupported()) return false;

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        return !!subscription;
    } catch (error) {
        console.error('[Push] Check subscription error:', error);
        return false;
    }
};

// Get subscription status from server
export const getSubscriptionStatus = async (token) => {
    try {
        const response = await fetch(`${BACKEND_API_URL}/push/status`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to get subscription status');
        }

        return await response.json();
    } catch (error) {
        console.error('[Push] Get status error:', error);
        return { isSubscribed: false, error: error.message };
    }
};

// Show local notification (for testing)
export const showLocalNotification = async (title, options = {}) => {
    if (!isPushSupported()) return;
    
    if (Notification.permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            vibrate: [100, 50, 100],
            ...options
        });
    }
};

export default {
    isPushSupported,
    getNotificationPermission,
    requestNotificationPermission,
    subscribeToPush,
    unsubscribeFromPush,
    isSubscribed,
    getSubscriptionStatus,
    showLocalNotification
};
