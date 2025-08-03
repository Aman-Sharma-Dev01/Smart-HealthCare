import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';
import Hospital from '../models/hospital.model.js';

export const getMyHospitalNotifications = async (req, res) => {
  const doctorId = req.user.id;

  try {
    // Find the hospital the logged-in doctor belongs to
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(403).json({ message: 'Access denied. Only for doctors.' });
    }

    const hospital = await Hospital.findOne({ name: doctor.hospitalName });
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital associated with this doctor not found.' });
    }

    // Fetch all notifications for that hospital
    const notifications = await Notification.find({ hospitalId: hospital._id })
      .sort({ createdAt: -1 })
      .populate('patientId', 'name phone') // Get patient details
      .populate('emergencyId', 'location emergencyType imagePath'); // Get emergency details

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};