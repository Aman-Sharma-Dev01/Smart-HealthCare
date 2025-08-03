import Emergency from '../models/emergency.model.js';
import Hospital from '../models/hospital.model.js';
import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';

export const createEmergencyAlert = async (req, res) => {
  const { lat, lng, emergencyType } = req.body;
  const userId = req.user.id;

  if (!lat || !lng || !emergencyType) {
    return res.status(400).json({ message: 'Latitude, longitude, and emergency type are required' });
  }

  try {
    // 1. Create the emergency alert
    const alertData = {
      userId,
      location: {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)],
      },
      emergencyType,
    };
    if (req.file) {
      alertData.imagePath = req.file.path;
    }
    const newAlert = await Emergency.create(alertData);

    // 2. Find the single nearest hospital
    const nearestHospital = await Hospital.findOne({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: 20000, // 20km radius
        },
      },
    });

    if (nearestHospital) {
      // 3. Create and send a notification to the nearest hospital
      const patient = await User.findById(userId);
      const notificationMessage = `Emergency Alert: A case of '${emergencyType}' for patient ${patient.name} (${patient.phone}) near your location.`;
      
      const newNotification = await Notification.create({
        hospitalId: nearestHospital._id,
        emergencyId: newAlert._id,
        patientId: userId,
        message: notificationMessage,
      });

      // 4. Emit a real-time alert to the hospital's dashboard
      const io = req.app.get('socketio');
      const hospitalRoom = `hospital_emergency_${nearestHospital._id}`;
      io.to(hospitalRoom).emit('new-emergency', newNotification);
    }

    res.status(201).json({ 
        alert: newAlert,
        notifiedHospital: nearestHospital ? nearestHospital.name : "No hospital found within range."
    });

  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};