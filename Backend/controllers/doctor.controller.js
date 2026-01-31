import User from '../models/user.model.js';
import Appointment from '../models/appointment.model.js';
import Hospital from '../models/hospital.model.js';

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

// Get doctors by hospital name with availability info
export const getDoctorsByHospital = async (req, res) => {
    const { hospitalName } = req.params;
    try {
        const doctors = await User.find({
            role: 'doctor',
            hospitalName: hospitalName
        }).select('name designation gender isOnline isAvailableToday availableDates averageRating totalReviews experience specialization consultationFee profileImage profileCompleted');
        res.json(doctors);
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// Get doctor profile by ID (public view)
export const getDoctorProfile = async (req, res) => {
    const { doctorId } = req.params;
    try {
        const doctor = await User.findById(doctorId).select('-password');
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(404).json({ message: 'Doctor not found.' });
        }
        
        // Get recent reviews for this doctor
        const recentAppointments = await Appointment.find({
            doctorId: doctorId,
            'feedback.rating': { $exists: true }
        })
        .select('feedback patientName createdAt')
        .sort({ 'feedback.createdAt': -1 })
        .limit(10);
        
        res.json({
            doctor,
            recentReviews: recentAppointments
        });
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// Update doctor profile
export const updateDoctorProfile = async (req, res) => {
    const doctorId = req.user.id;
    const { 
        specialization, 
        experience, 
        education, 
        consultationFee, 
        bio, 
        languages,
        profileImage 
    } = req.body;

    try {
        const doctor = await User.findById(doctorId);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(403).json({ message: 'Access denied. Doctors only.' });
        }

        // Update fields
        if (specialization) doctor.specialization = specialization;
        if (experience !== undefined) doctor.experience = experience;
        if (education) doctor.education = education;
        if (consultationFee !== undefined) doctor.consultationFee = consultationFee;
        if (bio) doctor.bio = bio;
        if (languages) doctor.languages = languages;
        if (profileImage) doctor.profileImage = profileImage;
        
        doctor.profileCompleted = true;
        await doctor.save();

        res.json({ message: 'Profile updated successfully', doctor });
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// Toggle doctor online/offline status
export const toggleOnlineStatus = async (req, res) => {
    const doctorId = req.user.id;

    try {
        const doctor = await User.findById(doctorId);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(403).json({ message: 'Access denied. Doctors only.' });
        }

        // Toggle the current status
        doctor.isOnline = !doctor.isOnline;
        if (doctor.isOnline) {
            doctor.isAvailableToday = true; // If going online, also available today
        }
        await doctor.save();

        res.json({ 
            message: `You are now ${doctor.isOnline ? 'online' : 'offline'}`, 
            isOnline: doctor.isOnline,
            isAvailableToday: doctor.isAvailableToday
        });
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// Toggle availability for today
export const toggleTodayAvailability = async (req, res) => {
    const doctorId = req.user.id;

    try {
        const doctor = await User.findById(doctorId);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(403).json({ message: 'Access denied. Doctors only.' });
        }

        // Toggle the current status
        doctor.isAvailableToday = !doctor.isAvailableToday;
        await doctor.save();

        res.json({ 
            message: `Availability for today ${doctor.isAvailableToday ? 'enabled' : 'disabled'}`, 
            isAvailableToday: doctor.isAvailableToday 
        });
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// Set available dates for appointments
export const setAvailableDates = async (req, res) => {
    const doctorId = req.user.id;
    const { dates } = req.body; // Array of date strings 'YYYY-MM-DD'

    try {
        const doctor = await User.findById(doctorId);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(403).json({ message: 'Access denied. Doctors only.' });
        }

        // Filter out past dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const validDates = (dates || []).filter(d => new Date(d) >= today);

        doctor.availableDates = validDates;
        await doctor.save();

        res.json({ 
            message: 'Available dates updated', 
            availableDates: doctor.availableDates 
        });
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// Get doctor's available dates
export const getAvailableDates = async (req, res) => {
    const { doctorId } = req.params;

    try {
        const doctor = await User.findById(doctorId);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(404).json({ message: 'Doctor not found.' });
        }

        // Filter out past dates and return only future availability
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const futureDates = (doctor.availableDates || []).filter(d => new Date(d) >= today);

        // Also include today if doctor is available today
        const availability = {
            isOnline: doctor.isOnline,
            isAvailableToday: doctor.isAvailableToday,
            availableDates: futureDates
        };

        res.json(availability);
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// Get doctor's appointment history
export const getDoctorAppointmentHistory = async (req, res) => {
    const doctorId = req.user.id;
    const { status, startDate, endDate } = req.query;

    try {
        const doctor = await User.findById(doctorId);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(403).json({ message: 'Access denied. Doctors only.' });
        }

        const query = { doctorId };
        
        if (status) {
            query.status = status;
        }
        
        if (startDate || endDate) {
            query.appointmentDate = {};
            if (startDate) query.appointmentDate.$gte = startDate;
            if (endDate) query.appointmentDate.$lte = endDate;
        }

        const appointments = await Appointment.find(query)
            .sort({ createdAt: -1 })
            .limit(100)
            .populate('patientId', 'name phone email')
            .populate('hospitalId', 'name');

        // Calculate stats
        const stats = {
            total: appointments.length,
            completed: appointments.filter(a => a.status === 'Completed').length,
            missed: appointments.filter(a => a.status === 'Missed').length,
            scheduled: appointments.filter(a => a.status === 'Scheduled').length,
            cancelled: appointments.filter(a => a.status === 'Cancelled').length
        };

        res.json({ appointments, stats });
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// Check if doctor profile needs completion (after first login)
export const checkProfileStatus = async (req, res) => {
    const doctorId = req.user.id;

    try {
        const doctor = await User.findById(doctorId);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(403).json({ message: 'Access denied. Doctors only.' });
        }

        res.json({
            profileCompleted: doctor.profileCompleted,
            doctor: {
                name: doctor.name,
                designation: doctor.designation,
                hospitalName: doctor.hospitalName,
                specialization: doctor.specialization,
                experience: doctor.experience,
                education: doctor.education,
                consultationFee: doctor.consultationFee,
                bio: doctor.bio,
                languages: doctor.languages,
                isOnline: doctor.isOnline,
                isAvailableToday: doctor.isAvailableToday,
                availableDates: doctor.availableDates,
                averageRating: doctor.averageRating,
                totalReviews: doctor.totalReviews
            }
        });
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};