import Emergency from '../models/emergency.model.js';
import Hospital from '../models/hospital.model.js';
import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';

export const createEmergencyAlert = async (req, res) => {
  const { lat, lng, emergencyType, incidentType } = req.body; // <-- Add incidentType
  const userId = req.user.id;

  if (!lat || !lng || !emergencyType || !incidentType) { // <-- Add incidentType to validation
    return res.status(400).json({ message: 'Latitude, longitude, emergency type, and incident type are required' });
  }

  try {
    const alertData = {
      userId,
      location: {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)],
      },
      emergencyType,
      incidentType, // <-- Add to data object
    };

    if (req.file) {
      if (req.file.cloudStorageError) {
        return res.status(500).json({ message: 'Error uploading image to cloud storage.' });
      }
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
      // Update the notification message to be more descriptive
      const notificationMessage = `Emergency Alert: A case of '${incidentType}' (${emergencyType}) for patient ${patient.name} (${patient.phone}) near your location.`;
      
      const newNotification = await Notification.create({
        hospitalId: nearestHospital._id,
        emergencyId: newAlert._id,
        patientId: userId,
        message: notificationMessage,
      });

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
