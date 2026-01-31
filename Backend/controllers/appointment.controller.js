import Appointment from '../models/appointment.model.js';
import Queue from '../models/queue.model.js';
import User from '../models/user.model.js';
import Hospital from '../models/hospital.model.js';

// Helper function to emit queue updates
const emitQueueUpdate = async (req, queueId) => {
    const populatedQueue = await Queue.findById(queueId)
        .populate({
            path: 'appointments',
            select: 'patientName reasonForVisit appointmentNumber status'
        });

    const io = req.app.get('socketio');
    const roomId = queueId.toString();
    io.to(roomId).emit('new-appointment', populatedQueue); // Announce the update
};

// For logged-in users booking for themselves
export const bookAppointment = async (req, res) => {
  const { hospitalId, doctorId, reasonForVisit, symptoms } = req.body;
  const patientId = req.user.id;

  try {
    const patient = await User.findById(patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const today = new Date().toISOString().slice(0, 10);
    let queue = await Queue.findOne({ doctorId, date: today });
    if (!queue) {
      queue = new Queue({ hospitalId, doctorId, date: today });
    }

    const newAppointmentNumber = queue.lastAppointmentNumber + 1;
    queue.lastAppointmentNumber = newAppointmentNumber;

    const appointment = new Appointment({
      patientId, doctorId, hospitalId, appointmentNumber: newAppointmentNumber,
      reasonForVisit, symptoms, patientName: patient.name, patientPhone: patient.phone,
    });

    queue.appointments.push(appointment._id);
    await appointment.save();
    await queue.save();

    // --- NEW: Announce the update to the doctor's dashboard ---
    await emitQueueUpdate(req, queue._id);

    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

// For helpdesk staff booking for walk-in patients
export const bookOfflineAppointment = async (req, res) => {
  const helpdeskId = req.user.id;
  const { doctorId, patientName, patientPhone, reasonForVisit, symptoms } = req.body;

  try {
    const helpdeskUser = await User.findById(helpdeskId);
    if (!helpdeskUser || helpdeskUser.role !== 'helpdesk') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor' || doctor.hospitalName !== helpdeskUser.hospitalName) {
      return res.status(404).json({ message: 'Doctor not found in your hospital.' });
    }
    
    const hospital = await Hospital.findOne({ name: doctor.hospitalName });
    if (!hospital) return res.status(404).json({ message: `Hospital named '${doctor.hospitalName}' not found.` });

    const today = new Date().toISOString().slice(0, 10);
    let queue = await Queue.findOne({ doctorId, date: today });
    if (!queue) {
      queue = new Queue({ hospitalId: hospital._id, doctorId, date: today });
    }

    const newAppointmentNumber = queue.lastAppointmentNumber + 1;
    queue.lastAppointmentNumber = newAppointmentNumber;

    const appointment = new Appointment({
      doctorId, hospitalId: hospital._id, appointmentNumber: newAppointmentNumber,
      patientName, patientPhone, reasonForVisit, symptoms,
    });

    queue.appointments.push(appointment._id);
    await appointment.save();
    await queue.save();

    // --- NEW: Announce the update to the doctor's dashboard ---
    await emitQueueUpdate(req, queue._id);

    res.status(201).json({ message: 'Offline appointment booked successfully.', appointment });
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};
// --- NEW FUNCTION ---
export const getLatestAppointment = async (req, res) => {
    const patientId = req.user.id;

    try {
        // First, check for today's appointment (any status - to show completed/missed)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todaysAppointment = await Appointment.findOne({
            patientId: patientId,
            createdAt: { $gte: today, $lt: tomorrow }
        })
        .sort({ createdAt: -1 })
        .populate('hospitalId', 'name')
        .populate('doctorId', 'name designation gender');

        // If there's a today's appointment, return it (regardless of status)
        if (todaysAppointment) {
            return res.json(todaysAppointment);
        }

        // Otherwise, find the next scheduled appointment
        const nextScheduledAppointment = await Appointment.findOne({
            patientId: patientId,
            status: 'Scheduled'
        })
        .sort({ appointmentDate: 1, createdAt: -1 })
        .populate('hospitalId', 'name')
        .populate('doctorId', 'name designation gender');

        if (nextScheduledAppointment) {
            return res.json(nextScheduledAppointment);
        }

        // No appointments found
        return res.json(null);
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};
// --- NEW FUNCTION ---
export const getTodaysHospitalAppointments = async (req, res) => {
    const userId = req.user.id;
    
    // Get the start of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get the start of tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
        const user = await User.findById(userId);
        if (!user || (user.role !== 'helpdesk' && user.role !== 'doctor')) {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const hospital = await Hospital.findOne({ name: user.hospitalName });
        if (!hospital) return res.status(404).json({ message: 'Hospital not found.' });

        const appointments = await Appointment.find({
            hospitalId: hospital._id,
            // Find appointments created between the start of today and the start of tomorrow
            createdAt: { $gte: today, $lt: tomorrow }
        })
        .sort({ appointmentNumber: 1 })
        .populate('doctorId', 'name');

        res.json(appointments);
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// --- NEW FUNCTION: Get appointment history for a patient ---
export const getAppointmentHistory = async (req, res) => {
    const patientId = req.user.id;

    try {
        const appointments = await Appointment.find({
            patientId: patientId
        })
        .sort({ createdAt: -1 }) // Most recent first
        .limit(50) // Limit to last 50 appointments
        .populate('hospitalId', 'name')
        .populate('doctorId', 'name designation gender averageRating');

        res.json(appointments);
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// --- Mark appointment as completed or missed (Doctor only) ---
export const markAppointmentStatus = async (req, res) => {
    const doctorId = req.user.id;
    const { appointmentId } = req.params;
    const { status, notes } = req.body;

    if (!['Completed', 'Missed'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status. Use Completed or Missed.' });
    }

    try {
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        if (appointment.doctorId.toString() !== doctorId) {
            return res.status(403).json({ message: 'Not authorized to update this appointment.' });
        }

        appointment.status = status;
        if (notes) appointment.doctorNotes = notes;
        if (status === 'Completed') appointment.completedAt = new Date();
        
        await appointment.save();

        // Emit socket event for queue update
        const io = req.app.get('socketio');
        io.emit('appointment-status-change', { appointmentId, status });

        res.json({ message: `Appointment marked as ${status}`, appointment });
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// --- Submit feedback for an appointment (Patient only) ---
export const submitFeedback = async (req, res) => {
    const patientId = req.user.id;
    const { appointmentId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
    }

    try {
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        if (appointment.patientId?.toString() !== patientId) {
            return res.status(403).json({ message: 'Not authorized to review this appointment.' });
        }

        if (appointment.status !== 'Completed') {
            return res.status(400).json({ message: 'Can only review completed appointments.' });
        }

        if (appointment.feedback?.rating) {
            return res.status(400).json({ message: 'Feedback already submitted.' });
        }

        appointment.feedback = {
            rating,
            comment: comment || '',
            createdAt: new Date()
        };
        await appointment.save();

        // Update doctor's average rating
        const doctor = await User.findById(appointment.doctorId);
        if (doctor) {
            const allFeedbacks = await Appointment.find({
                doctorId: appointment.doctorId,
                'feedback.rating': { $exists: true }
            }).select('feedback.rating');

            const totalRating = allFeedbacks.reduce((sum, a) => sum + a.feedback.rating, 0);
            doctor.averageRating = totalRating / allFeedbacks.length;
            doctor.totalReviews = allFeedbacks.length;
            await doctor.save();
        }

        res.json({ message: 'Feedback submitted successfully', appointment });
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// --- Reschedule appointment ---
export const rescheduleAppointment = async (req, res) => {
    const patientId = req.user.id;
    const { appointmentId } = req.params;
    const { newDate } = req.body;

    if (!newDate) {
        return res.status(400).json({ message: 'New date is required.' });
    }

    try {
        const originalAppointment = await Appointment.findById(appointmentId)
            .populate('doctorId')
            .populate('hospitalId');
            
        if (!originalAppointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        if (originalAppointment.patientId?.toString() !== patientId) {
            return res.status(403).json({ message: 'Not authorized to reschedule this appointment.' });
        }

        if (originalAppointment.status !== 'Scheduled') {
            return res.status(400).json({ message: 'Can only reschedule scheduled appointments.' });
        }

        // Check if doctor is available on the new date
        const doctor = await User.findById(originalAppointment.doctorId._id);
        // availableDates is now a simple array of date strings
        const isDateAvailable = doctor.availableDates?.includes(newDate);
        
        const today = new Date().toISOString().slice(0, 10);
        if (newDate === today && !doctor.isAvailableToday) {
            return res.status(400).json({ message: 'Doctor is not available today.' });
        }

        if (newDate !== today && !isDateAvailable) {
            return res.status(400).json({ message: 'Doctor is not available on the selected date.' });
        }

        // Find or create queue for new date
        let queue = await Queue.findOne({ 
            doctorId: originalAppointment.doctorId._id, 
            date: newDate 
        });
        
        if (!queue) {
            queue = new Queue({ 
                hospitalId: originalAppointment.hospitalId._id, 
                doctorId: originalAppointment.doctorId._id, 
                date: newDate 
            });
        }

        const newAppointmentNumber = queue.lastAppointmentNumber + 1;
        queue.lastAppointmentNumber = newAppointmentNumber;

        // Create new appointment
        const newAppointment = new Appointment({
            patientId: originalAppointment.patientId,
            doctorId: originalAppointment.doctorId._id,
            hospitalId: originalAppointment.hospitalId._id,
            appointmentNumber: newAppointmentNumber,
            reasonForVisit: originalAppointment.reasonForVisit,
            symptoms: originalAppointment.symptoms,
            patientName: originalAppointment.patientName,
            patientPhone: originalAppointment.patientPhone,
            appointmentDate: newDate,
            rescheduledFrom: originalAppointment._id
        });

        queue.appointments.push(newAppointment._id);

        // Mark original as rescheduled
        originalAppointment.status = 'Rescheduled';
        originalAppointment.rescheduledTo = newAppointment._id;

        await newAppointment.save();
        await originalAppointment.save();
        await queue.save();

        // Emit socket event
        const io = req.app.get('socketio');
        io.to(queue._id.toString()).emit('new-appointment', await Queue.findById(queue._id)
            .populate({
                path: 'appointments',
                select: 'patientName reasonForVisit appointmentNumber status'
            }));

        res.json({ 
            message: 'Appointment rescheduled successfully',
            oldAppointment: originalAppointment,
            newAppointment 
        });
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// --- Get single appointment details ---
export const getAppointmentDetails = async (req, res) => {
    const userId = req.user.id;
    const { appointmentId } = req.params;

    try {
        const appointment = await Appointment.findById(appointmentId)
            .populate('doctorId', 'name designation gender hospitalName specialization experience averageRating totalReviews consultationFee profileImage isOnline')
            .populate('hospitalId', 'name address phone')
            .populate('rescheduledFrom', 'appointmentDate appointmentNumber')
            .populate('rescheduledTo', 'appointmentDate appointmentNumber');

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        // Check if user is authorized to view
        const isPatient = appointment.patientId?.toString() === userId;
        const isDoctor = appointment.doctorId._id.toString() === userId;
        
        if (!isPatient && !isDoctor) {
            return res.status(403).json({ message: 'Not authorized to view this appointment.' });
        }

        res.json(appointment);
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// --- Cancel appointment ---
export const cancelAppointment = async (req, res) => {
    const patientId = req.user.id;
    const { appointmentId } = req.params;

    try {
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        if (appointment.patientId?.toString() !== patientId) {
            return res.status(403).json({ message: 'Not authorized to cancel this appointment.' });
        }

        if (appointment.status !== 'Scheduled') {
            return res.status(400).json({ message: 'Can only cancel scheduled appointments.' });
        }

        appointment.status = 'Cancelled';
        await appointment.save();

        // Get socket.io instance
        const io = req.app.get('socketio');

        // Emit appointment-status-change event for real-time updates
        io.emit('appointment-status-change', { appointmentId, status: 'Cancelled' });

        // Remove from queue
        const appointmentDate = appointment.appointmentDate || new Date(appointment.createdAt).toISOString().slice(0, 10);
        const queue = await Queue.findOne({ 
            doctorId: appointment.doctorId, 
            date: appointmentDate 
        });
        
        if (queue) {
            // Don't remove from queue array - just let it stay with Cancelled status
            // This keeps appointment numbers consistent
            // queue.appointments = queue.appointments.filter(
            //     id => id.toString() !== appointmentId
            // );
            // await queue.save();

            // Emit socket update for doctor's dashboard to refresh
            const populatedQueue = await Queue.findById(queue._id)
                .populate({
                    path: 'appointments',
                    select: 'patientName reasonForVisit appointmentNumber status'
                });
            io.to(queue._id.toString()).emit('new-appointment', populatedQueue);
        }

        res.json({ message: 'Appointment cancelled successfully', appointment });
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// --- Book appointment for a specific date ---
export const bookAppointmentForDate = async (req, res) => {
    const { hospitalId, doctorId, reasonForVisit, symptoms, appointmentDate } = req.body;
    const patientId = req.user.id;

    try {
        const patient = await User.findById(patientId);
        if (!patient) return res.status(404).json({ message: 'Patient not found' });

        const doctor = await User.findById(doctorId);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        const today = new Date().toISOString().slice(0, 10);
        const bookingDate = appointmentDate || today;

        // Check availability
        if (bookingDate === today) {
            if (!doctor.isOnline || !doctor.isAvailableToday) {
                return res.status(400).json({ message: 'Doctor is not available today.' });
            }
        } else {
            // availableDates is now a simple array of date strings
            const isDateAvailable = doctor.availableDates?.includes(bookingDate);
            if (!isDateAvailable) {
                return res.status(400).json({ message: 'Doctor is not available on the selected date.' });
            }
        }

        let queue = await Queue.findOne({ doctorId, date: bookingDate });
        if (!queue) {
            queue = new Queue({ hospitalId, doctorId, date: bookingDate });
        }

        const newAppointmentNumber = queue.lastAppointmentNumber + 1;
        queue.lastAppointmentNumber = newAppointmentNumber;

        const appointment = new Appointment({
            patientId, 
            doctorId, 
            hospitalId, 
            appointmentNumber: newAppointmentNumber,
            reasonForVisit, 
            symptoms, 
            patientName: patient.name, 
            patientPhone: patient.phone,
            appointmentDate: bookingDate
        });

        queue.appointments.push(appointment._id);
        await appointment.save();
        await queue.save();

        // Emit queue update
        await emitQueueUpdate(req, queue._id);

        res.status(201).json(appointment);
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};