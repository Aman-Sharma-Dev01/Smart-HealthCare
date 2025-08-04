import Emergency from '../models/emergency.model.js';
import Hospital from '../models/hospital.model.js';
import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';

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

export const manageEmergency = async (req, res) => {
  const { emergencyId } = req.params;
  const { status, action } = req.body;
  const helpdeskId = req.user.id;

  try {
    const emergency = await Emergency.findById(emergencyId);
    if (!emergency) {
      return res.status(404).json({ message: 'Emergency alert not found.' });
    }

    if (status) emergency.status = status;
    if (action) {
      emergency.actionLog.push({ action, by: helpdeskId });
    }

    await emergency.save();
    res.json({ message: 'Emergency status updated.', emergency });
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};
