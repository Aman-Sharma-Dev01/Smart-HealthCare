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
        const latestAppointment = await Appointment.findOne({
            patientId: patientId,
            status: 'Scheduled' // Only find appointments that are still upcoming
        })
        .sort({ createdAt: -1 }) // Get the most recently created one
        .populate('hospitalId', 'name') // Get the full hospital object (just the name)
        .populate('doctorId', 'name designation gender');   // Get the full doctor object

        // It's okay if no appointment is found, just return null
        if (!latestAppointment) {
            return res.json(null);
        }

        res.json(latestAppointment);
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
        .populate('doctorId', 'name designation gender');

        res.json(appointments);
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// --- Book appointment for a specific date ---
export const bookAppointmentForDate = async (req, res) => {
    const { hospitalId, doctorId, reasonForVisit, symptoms, date } = req.body;
    const patientId = req.user.id;

    try {
        const patient = await User.findById(patientId);
        if (!patient) return res.status(404).json({ message: 'Patient not found' });

        const appointmentDate = date || new Date().toISOString().slice(0, 10);
        let queue = await Queue.findOne({ doctorId, date: appointmentDate });
        if (!queue) {
            queue = new Queue({ hospitalId, doctorId, date: appointmentDate });
        }

        const newAppointmentNumber = queue.lastAppointmentNumber + 1;
        queue.lastAppointmentNumber = newAppointmentNumber;

        const appointment = new Appointment({
            patientId, doctorId, hospitalId, appointmentNumber: newAppointmentNumber,
            reasonForVisit, symptoms, patientName: patient.name, patientPhone: patient.phone,
            scheduledDate: appointmentDate
        });

        queue.appointments.push(appointment._id);
        await appointment.save();
        await queue.save();

        await emitQueueUpdate(req, queue._id);

        res.status(201).json(appointment);
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// --- Get appointment details by ID ---
export const getAppointmentDetails = async (req, res) => {
    const { appointmentId } = req.params;

    try {
        const appointment = await Appointment.findById(appointmentId)
            .populate('hospitalId', 'name')
            .populate('doctorId', 'name designation gender');

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        res.json(appointment);
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// --- Mark appointment status (Completed, No-Show, etc.) ---
export const markAppointmentStatus = async (req, res) => {
    const { appointmentId } = req.params;
    const { status } = req.body;

    try {
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        appointment.status = status;
        await appointment.save();

        res.json({ message: 'Appointment status updated.', appointment });
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// --- Reschedule an appointment ---
export const rescheduleAppointment = async (req, res) => {
    const { appointmentId } = req.params;
    const { newDate } = req.body;

    try {
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        appointment.scheduledDate = newDate;
        appointment.status = 'Scheduled';
        await appointment.save();

        res.json({ message: 'Appointment rescheduled.', appointment });
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// --- Cancel an appointment ---
export const cancelAppointment = async (req, res) => {
    const { appointmentId } = req.params;

    try {
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        appointment.status = 'Cancelled';
        await appointment.save();

        res.json({ message: 'Appointment cancelled.', appointment });
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// --- Submit feedback for an appointment ---
export const submitFeedback = async (req, res) => {
    const { appointmentId } = req.params;
    const { rating, comment } = req.body;

    try {
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        appointment.feedback = { rating, comment, submittedAt: new Date() };
        await appointment.save();

        res.json({ message: 'Feedback submitted.', appointment });
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};
