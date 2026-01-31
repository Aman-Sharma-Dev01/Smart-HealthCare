import webpush from 'web-push';
import PushSubscription from '../models/pushSubscription.model.js';

// Configure web-push with VAPID keys
// Generate keys using: npx web-push generate-vapid-keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(
        'mailto:medicare-plus@example.com',
        vapidPublicKey,
        vapidPrivateKey
    );
}

/**
 * Send push notification to a specific user
 * @param {string} userId - The user ID to send notification to
 * @param {object} payload - The notification payload
 */
export const sendPushNotification = async (userId, payload) => {
    if (!vapidPublicKey || !vapidPrivateKey) {
        console.log('[Push] VAPID keys not configured, skipping push notification');
        return;
    }

    try {
        // Find all active subscriptions for the user
        const subscriptions = await PushSubscription.find({ 
            userId, 
            isActive: true 
        });

        if (subscriptions.length === 0) {
            console.log(`[Push] No subscriptions found for user ${userId}`);
            return;
        }

        const notificationPayload = JSON.stringify(payload);

        // Send to all user's devices
        const results = await Promise.allSettled(
            subscriptions.map(async (sub) => {
                try {
                    await webpush.sendNotification(sub.subscription, notificationPayload);
                    // Update last used
                    sub.lastUsed = new Date();
                    await sub.save();
                    return { success: true, endpoint: sub.subscription.endpoint };
                } catch (error) {
                    // If subscription is invalid, mark as inactive
                    if (error.statusCode === 404 || error.statusCode === 410) {
                        console.log(`[Push] Subscription expired, marking inactive: ${sub.subscription.endpoint}`);
                        sub.isActive = false;
                        await sub.save();
                    }
                    throw error;
                }
            })
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        console.log(`[Push] Sent to user ${userId}: ${successful} successful, ${failed} failed`);
        return { successful, failed };
    } catch (error) {
        console.error('[Push] Error sending notification:', error);
    }
};

/**
 * Send "It's Your Turn" notification
 */
export const sendYourTurnNotification = async (userId, doctorName, hospitalName) => {
    return sendPushNotification(userId, {
        type: 'your-turn',
        title: "🔔 It's Your Turn!",
        body: `Please proceed to Dr. ${doctorName} at ${hospitalName}. Your number is being called now!`,
        url: '/pwa'
    });
};

/**
 * Send "Appointment Completed" notification
 */
export const sendAppointmentCompletedNotification = async (userId, doctorName, appointmentId) => {
    return sendPushNotification(userId, {
        type: 'appointment-completed',
        title: '✅ Appointment Completed',
        body: `Your appointment with Dr. ${doctorName} has been completed. Please leave your feedback!`,
        url: '/pwa',
        appointmentId
    });
};

/**
 * Send "Appointment Missed" notification
 */
export const sendAppointmentMissedNotification = async (userId, doctorName) => {
    return sendPushNotification(userId, {
        type: 'appointment-missed',
        title: '❌ Appointment Missed',
        body: `You missed your appointment with Dr. ${doctorName}. Please reschedule at your convenience.`,
        url: '/pwa'
    });
};

/**
 * Send "Appointment Cancelled" notification
 */
export const sendAppointmentCancelledNotification = async (userId, doctorName, appointmentDate) => {
    return sendPushNotification(userId, {
        type: 'appointment-cancelled',
        title: '🚫 Appointment Cancelled',
        body: `Your appointment with Dr. ${doctorName} on ${appointmentDate} has been cancelled.`,
        url: '/pwa'
    });
};

/**
 * Send "Queue Update" notification (approaching turn)
 */
export const sendQueueUpdateNotification = async (userId, currentNumber, yourNumber, doctorName) => {
    const patientsAhead = yourNumber - currentNumber;
    if (patientsAhead <= 3 && patientsAhead > 0) {
        return sendPushNotification(userId, {
            type: 'queue-update',
            title: '⏳ Almost Your Turn!',
            body: `Only ${patientsAhead} patient${patientsAhead > 1 ? 's' : ''} ahead of you for Dr. ${doctorName}. Please be ready!`,
            url: '/pwa'
        });
    }
};

/**
 * Send reminder notification
 */
export const sendAppointmentReminderNotification = async (userId, doctorName, hospitalName, appointmentDate) => {
    return sendPushNotification(userId, {
        type: 'reminder',
        title: '📅 Appointment Reminder',
        body: `Reminder: You have an appointment with Dr. ${doctorName} at ${hospitalName} on ${appointmentDate}.`,
        url: '/pwa'
    });
};

/**
 * Send "New Medical Record" notification
 */
export const sendNewRecordNotification = async (userId, doctorName, recordType) => {
    return sendPushNotification(userId, {
        type: 'new-record',
        title: '📋 New Medical Record',
        body: `Dr. ${doctorName} has uploaded a new ${recordType || 'document'} to your health records.`,
        url: '/pwa?tab=records'
    });
};

/**
 * Send "Emergency Alert Sent" notification (confirmation to patient)
 */
export const sendEmergencyAlertSentNotification = async (userId, hospitalName) => {
    return sendPushNotification(userId, {
        type: 'emergency-sent',
        title: '🚨 Emergency Alert Sent!',
        body: hospitalName 
            ? `Your SOS alert has been sent to ${hospitalName}. Help is being arranged.`
            : 'Your SOS alert has been sent to nearby hospitals. Stay calm, help is coming.',
        url: '/pwa'
    });
};

/**
 * Send "Help On The Way" notification
 */
export const sendHelpOnTheWayNotification = async (userId, hospitalName, estimatedTime) => {
    return sendPushNotification(userId, {
        type: 'help-coming',
        title: '🚑 Help is On The Way!',
        body: estimatedTime 
            ? `${hospitalName} has acknowledged your emergency. ETA: ${estimatedTime} minutes.`
            : `${hospitalName} has acknowledged your emergency. Help is on the way!`,
        url: '/pwa'
    });
};

export default {
    sendPushNotification,
    sendYourTurnNotification,
    sendAppointmentCompletedNotification,
    sendAppointmentMissedNotification,
    sendAppointmentCancelledNotification,
    sendQueueUpdateNotification,
    sendAppointmentReminderNotification,
    sendNewRecordNotification,
    sendEmergencyAlertSentNotification,
    sendHelpOnTheWayNotification
};
