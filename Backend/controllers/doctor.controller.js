import User from '../models/user.model.js';

export const getHospitalDoctors = async (req, res) => {
  const helpdeskId = req.user.id;
  const { search } = req.query;

  try {
    const helpdeskUser = await User.findById(helpdeskId);
    if (!helpdeskUser || helpdeskUser.role !== 'helpdesk') {
      return res.status(403).json({ message: 'Access denied. For helpdesk staff only.' });
    }

    const query = {
      role: 'doctor',
      hospitalName: helpdeskUser.hospitalName,
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } }
      ];
    }

    const doctors = await User.find(query).select('-password');
    res.json(doctors);

  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};
// --- NEW FUNCTION ---
export const getDoctorsByHospital = async (req, res) => {
    const { hospitalName } = req.params;
    try {
        const doctors = await User.find({
            role: 'doctor',
            hospitalName: hospitalName
        }).select('name designation gender'); // Send only public info including gender
        res.json(doctors);
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// Check profile status for doctor
export const checkProfileStatus = async (req, res) => {
    try {
        const doctor = await User.findById(req.user.id).select('-password');
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(403).json({ message: 'Access denied. Doctors only.' });
        }
        res.json({
            isProfileComplete: !!(doctor.name && doctor.designation && doctor.hospitalName),
            isOnline: doctor.isOnline || false,
            isTodayAvailable: doctor.isTodayAvailable || false,
            profile: doctor
        });
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// Get doctor profile by ID
export const getDoctorProfile = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const doctor = await User.findById(doctorId).select('-password');
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(404).json({ message: 'Doctor not found' });
        }
        res.json(doctor);
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// Update doctor profile
export const updateDoctorProfile = async (req, res) => {
    try {
        const doctor = await User.findById(req.user.id);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(403).json({ message: 'Access denied. Doctors only.' });
        }

        const { name, designation, phone } = req.body;
        if (name) doctor.name = name;
        if (designation) doctor.designation = designation;
        if (phone) doctor.phone = phone;

        await doctor.save();
        res.json({ message: 'Profile updated successfully', doctor: { ...doctor.toObject(), password: undefined } });
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// Toggle online status
export const toggleOnlineStatus = async (req, res) => {
    try {
        const doctor = await User.findById(req.user.id);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(403).json({ message: 'Access denied. Doctors only.' });
        }

        doctor.isOnline = !doctor.isOnline;
        await doctor.save();
        res.json({ message: `Online status: ${doctor.isOnline ? 'Online' : 'Offline'}`, isOnline: doctor.isOnline });
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// Toggle today availability
export const toggleTodayAvailability = async (req, res) => {
    try {
        const doctor = await User.findById(req.user.id);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(403).json({ message: 'Access denied. Doctors only.' });
        }

        doctor.isTodayAvailable = !doctor.isTodayAvailable;
        await doctor.save();
        res.json({ message: `Today availability: ${doctor.isTodayAvailable ? 'Available' : 'Not Available'}`, isTodayAvailable: doctor.isTodayAvailable });
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// Set available dates
export const setAvailableDates = async (req, res) => {
    try {
        const doctor = await User.findById(req.user.id);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(403).json({ message: 'Access denied. Doctors only.' });
        }

        const { availableDates } = req.body;
        doctor.availableDates = availableDates || [];
        await doctor.save();
        res.json({ message: 'Available dates updated', availableDates: doctor.availableDates });
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// Get available dates for a doctor
export const getAvailableDates = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const doctor = await User.findById(doctorId).select('availableDates name');
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(404).json({ message: 'Doctor not found' });
        }
        res.json({ availableDates: doctor.availableDates || [] });
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// Get doctor appointment history
export const getDoctorAppointmentHistory = async (req, res) => {
    try {
        const doctor = await User.findById(req.user.id);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(403).json({ message: 'Access denied. Doctors only.' });
        }

        // Import Appointment model dynamically to avoid circular dependency
        const Appointment = (await import('../models/appointment.model.js')).default;
        const appointments = await Appointment.find({ doctor: req.user.id })
            .populate('patient', 'name email phone')
            .sort({ date: -1 });

        res.json(appointments);
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};