import Emergency from '../models/emergency.model.js';
import Hospital from '../models/hospital.model.js';
import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';
import { 
    sendEmergencyAlertSentNotification, 
    sendHelpOnTheWayNotification 
} from '../services/pushNotification.service.js';

export const createEmergencyAlert = async (req, res) => {
  const { lat, lng, emergencyType, incidentType } = req.body;
  const userId = req.user.id;

  if (!lat || !lng || !emergencyType || !incidentType) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const alertData = {
      userId,
      location: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
      emergencyType,
      incidentType,
    };

    if (req.file) {
      alertData.imagePath = req.file.gcsUrl;
    }

    const newAlert = await Emergency.create(alertData);

    const nearestHospital = await Hospital.findOne({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: 20000,
        },
      },
    });

    if (nearestHospital) {
      const patient = await User.findById(userId);
      const notificationMessage = `Emergency Alert: A case of '${incidentType}' (${emergencyType}) for patient ${patient.name} (${patient.phone}) near your location.`;
      
      const newNotification = await Notification.create({
        hospitalId: nearestHospital._id,
        emergencyId: newAlert._id,
        patientId: userId,
        message: notificationMessage,
      });

      // --- THIS IS THE FIX ---
      // Re-fetch the notification to populate the fields before emitting it
      const populatedNotification = await Notification.findById(newNotification._id)
          .populate('patientId', 'name phone')
          .populate('emergencyId', 'location emergencyType incidentType imagePath status');

      // Emit the fully populated notification object
      const io = req.app.get('socketio');
      const hospitalRoom = `hospital_emergency_${nearestHospital._id}`;
      io.to(hospitalRoom).emit('new-emergency', populatedNotification);

      // Send push notification to patient confirming SOS was sent
      sendEmergencyAlertSentNotification(userId, nearestHospital.name);
    } else {
      // No hospital found but still confirm alert was sent
      sendEmergencyAlertSentNotification(userId, null);
    }

    res.status(201).json({ 
        alert: newAlert,
        notifiedHospital: nearestHospital ? nearestHospital.name : "No hospital found within range."
    });
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

// ... (manageEmergency function remains the same)
export const manageEmergency = async (req, res) => {
  const { emergencyId } = req.params;
  const { action, estimatedTime } = req.body;
  const helpdeskId = req.user.id;

  try {
    const emergency = await Emergency.findById(emergencyId);
    if (!emergency) {
      return res.status(404).json({ message: 'Emergency alert not found.' });
    }

    // Get helpdesk user info to find hospital name
    const helpdeskUser = await User.findById(helpdeskId).populate('hospitalId', 'name');
    const hospitalName = helpdeskUser?.hospitalId?.name || 'Hospital';

    // --- THIS IS THE FIX ---
    // 1. Automatically update the status to 'acknowledged'.
    emergency.status = 'acknowledged';

    // 2. Log the specific action taken by the helpdesk user.
    if (action) {
      emergency.actionLog.push({ action, by: helpdeskId });
    }

    await emergency.save();

    // --- NEW: Notify the patient in real-time about the action ---
    const io = req.app.get('socketio');
    const patientRoom = `user_${emergency.userId}`;
    io.to(patientRoom).emit('emergency-updated', emergency);

    // Send "Help On The Way" push notification to patient
    sendHelpOnTheWayNotification(emergency.userId.toString(), hospitalName, estimatedTime);

    res.json({ message: 'Emergency status updated.', emergency });

  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};
