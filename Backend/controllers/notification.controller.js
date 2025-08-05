import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';
import Hospital from '../models/hospital.model.js';

export const getMyHospitalNotifications = async (req, res) => {
  const userId = req.user.id;

  try {
    // Find the user (could be a doctor or helpdesk staff)
    const user = await User.findById(userId);

    // --- THIS IS THE CORRECTED LOGIC ---
    // Check if the user has the correct role (doctor OR helpdesk)
    if (!user || (user.role !== 'doctor' && user.role !== 'helpdesk')) {
      return res.status(403).json({ message: 'Access denied. For hospital staff only.' });
    }

    // Find the hospital associated with this user
    const hospital = await Hospital.findOne({ name: user.hospitalName });
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital associated with this user not found.' });
    }

    // Fetch all notifications for that hospital
    const notifications = await Notification.find({ hospitalId: hospital._id })
      .sort({ createdAt: -1 })
      .populate('patientId', 'name phone') // Get patient details
      .populate('emergencyId', 'location emergencyType incidentType imagePath'); // Get emergency details

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};
