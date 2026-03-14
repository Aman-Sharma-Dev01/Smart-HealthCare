import Queue from '../models/queue.model.js';
import Appointment from '../models/appointment.model.js';
import User from '../models/user.model.js';
import Hospital from '../models/hospital.model.js';
import mongoose from 'mongoose';
import { 
    sendYourTurnNotification, 
    sendAppointmentCompletedNotification, 
    sendAppointmentMissedNotification,
    sendQueueUpdateNotification 
} from '../services/pushNotification.service.js';

/**
 * @desc    Get queue status for a specific doctor, including the user's appointment info.
 * @route   GET /api/queues/status/:doctorId
 * @access  Protected
 */
export const getQueueStatus = async (req, res) => {
  const { doctorId } = req.params;
  const patientId = req.user.id;
  const today = new Date().toISOString().slice(0, 10);

  try {
    // Find today's queue for the specified doctor
    const queue = await Queue.findOne({ doctorId, date: today });

    if (!queue) {
      return res.status(404).json({ message: "No active queue found for this doctor today." });
    }

    // Find the logged-in user's appointment within that queue
    const userAppointment = await Appointment.findOne({
      patientId: patientId,
      _id: { $in: queue.appointments }
    });

    if (!userAppointment) {
      // Still return queue info, but indicate no appointment for this user
      return res.status(404).json({ 
          message: "Queue found, but you do not have an appointment with this doctor today.",
          queueId: queue._id,
          currentNumber: queue.currentNumber,
          totalInQueue: queue.lastAppointmentNumber,
          yourAppointment: null
      });
    }
    
    res.json({
      queueId: queue._id,
      currentNumber: queue.currentNumber,
      totalInQueue: queue.lastAppointmentNumber,
      yourAppointment: userAppointment
    });

  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

/**
 * @desc    Advance the queue to the next number (Admin/Doctor function)
 * @route   PUT /api/queues/next/:queueId
 * @access  Protected
 */
export const advanceQueue = async (req, res) => {
  const { queueId } = req.params;
  const { markPreviousAs } = req.body; // 'Completed' or 'Missed'
  
  try {
    const queue = await Queue.findById(queueId)
      .populate('appointments')
      .populate('doctorId', 'name');
    if (!queue) {
      return res.status(404).json({ message: 'Queue not found.' });
    }

    // Prevent advancing beyond the last patient
    if (queue.currentNumber >= queue.lastAppointmentNumber) {
      return res.status(400).json({ message: 'End of queue reached. No more patients.' });
    }
    
    // Mark the current appointment based on doctor's choice (only if it's still Scheduled)
    if (queue.currentNumber > 0) {
      const currentAppointment = await Appointment.findOne({
        _id: { $in: queue.appointments },
        appointmentNumber: queue.currentNumber
      }).populate('hospitalId', 'name');

      if (currentAppointment && currentAppointment.status === 'Scheduled') {
        currentAppointment.status = markPreviousAs || 'Completed';
        if (markPreviousAs === 'Completed') {
          currentAppointment.completedAt = new Date();
        }
        await currentAppointment.save();
      }
    }
    
    // Find the next valid appointment number (skip Cancelled, Completed, Missed)
    let nextNumber = queue.currentNumber + 1;
    while (nextNumber <= queue.lastAppointmentNumber) {
      const nextAppointment = queue.appointments.find(a => a.appointmentNumber === nextNumber);
      if (nextAppointment && nextAppointment.status === 'Scheduled') {
        break; // Found a valid scheduled appointment
      }
      nextNumber++;
    }
    
    queue.currentNumber = nextNumber;
    await queue.save();

    const io = req.app.get('socketio');
    const roomId = queue._id.toString();
    io.to(roomId).emit('queue-update', {
      currentNumber: queue.currentNumber,
    });

    // Send push notifications
    const doctorName = queue.doctorId?.name || 'Doctor';
    
    // Find the patient whose turn it is now and send "Your Turn" notification
    const currentPatientAppointment = await Appointment.findOne({
      _id: { $in: queue.appointments },
      appointmentNumber: queue.currentNumber,
      status: 'Scheduled'
    }).populate('hospitalId', 'name');

    if (currentPatientAppointment) {
      const hospitalName = currentPatientAppointment.hospitalId?.name || 'Hospital';
      sendYourTurnNotification(
        currentPatientAppointment.patientId.toString(),
        doctorName,
        hospitalName
      );
    }

    // Send "Almost Your Turn" notification to patients who are 2-3 positions away
    const upcomingAppointments = queue.appointments.filter(
      a => a.status === 'Scheduled' && 
           a.appointmentNumber > queue.currentNumber && 
           a.appointmentNumber <= queue.currentNumber + 3
    );

    for (const apt of upcomingAppointments) {
      sendQueueUpdateNotification(
        apt.patientId.toString(),
        queue.currentNumber,
        apt.appointmentNumber,
        doctorName
      );
    }
    
    res.json({
      message: 'Queue advanced successfully',
      queue: queue
    });

  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

/**
 * @desc    Mark specific appointment status without advancing queue
 * @route   PUT /api/queues/mark-appointment/:appointmentId
 * @access  Protected (Doctor only)
 */
export const markAppointmentInQueue = async (req, res) => {
    const { appointmentId } = req.params;
    const { status, notes } = req.body;
    const doctorId = req.user.id;

    if (!['Completed', 'Missed'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status. Use Completed or Missed.' });
    }

    try {
        const appointment = await Appointment.findById(appointmentId)
            .populate('doctorId', 'name');
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        if (appointment.doctorId._id.toString() !== doctorId) {
            return res.status(403).json({ message: 'Not authorized.' });
        }

        appointment.status = status;
        if (notes) appointment.doctorNotes = notes;
        if (status === 'Completed') appointment.completedAt = new Date();
        await appointment.save();

        // Find the queue to get the room ID
        const today = new Date().toISOString().slice(0, 10);
        const queue = await Queue.findOne({ doctorId, date: today });

        // Emit update to the specific queue room
        const io = req.app.get('socketio');
        if (queue) {
            io.to(queue._id.toString()).emit('appointment-status-change', { appointmentId, status });
        }
        // Also emit globally for patients listening
        io.emit('appointment-status-change', { appointmentId, status });

        // Send push notifications based on status
        const doctorName = appointment.doctorId?.name || 'Doctor';
        const patientId = appointment.patientId.toString();

        if (status === 'Completed') {
            sendAppointmentCompletedNotification(patientId, doctorName, appointmentId);
        } else if (status === 'Missed') {
            sendAppointmentMissedNotification(patientId, doctorName);
        }

        res.json({ message: `Appointment marked as ${status}`, appointment });
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// --- NEW FUNCTION ---
export const getMyQueue = async (req, res) => {
    const doctorId = req.user.id;
    const today = new Date().toISOString().slice(0, 10);

    try {
        const queue = await Queue.findOne({ doctorId, date: today })
            .populate({
                path: 'appointments',
                select: 'patientName reasonForVisit appointmentNumber status patientPhone symptoms' // Select fields you need
            });

        // If no appointments today, it's not an error, just return an empty state
        if (!queue) {
            return res.json(null);
        }
        
        res.json(queue);
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

// Get queue for a specific date
export const getQueueByDate = async (req, res) => {
    const doctorId = req.user.id;
    const { date } = req.params;

    try {
        const queue = await Queue.findOne({ doctorId, date })
            .populate({
                path: 'appointments',
                select: 'patientName reasonForVisit appointmentNumber status patientPhone symptoms'
            });

        if (!queue) {
            return res.json(null);
        }
        
        res.json(queue);
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

  /**
   * @desc    Get queue snapshots for hospital staff (helpdesk/doctor)
   * @route   GET /api/queues/hospital/snapshots
   * @access  Protected
   */
  export const getHospitalQueueSnapshots = async (req, res) => {
    const userId = req.user.id;
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const doctorIds = (req.query.doctorIds || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    try {
      const user = await User.findById(userId).select('role hospitalName');
      if (!user || (user.role !== 'helpdesk' && user.role !== 'doctor')) {
        return res.status(403).json({ message: 'Access denied. Hospital staff only.' });
      }

      const hospital = await Hospital.findOne({ name: user.hospitalName }).select('_id');
      if (!hospital) {
        return res.status(404).json({ message: 'Hospital not found.' });
      }

      const query = { hospitalId: hospital._id, date };
      if (doctorIds.length > 0) {
        query.doctorId = { $in: doctorIds };
      }

      const queues = await Queue.find(query).select('doctorId currentNumber lastAppointmentNumber appointments');

      const snapshots = queues.map((queue) => ({
        doctorId: queue.doctorId.toString(),
        queueId: queue._id.toString(),
        currentNumber: queue.currentNumber || 0,
        totalInQueue: queue.lastAppointmentNumber || 0,
        nextPriorityToken: Math.max((queue.currentNumber || 0) + 1, 1),
      }));

      return res.json({ date, snapshots });
    } catch (error) {
      return res.status(500).json({ message: `Server Error: ${error.message}` });
    }
  };

/**
 * @desc    Promote an existing queued appointment to the front priority slot
 * @route   PUT /api/queues/prioritize/:appointmentId
 * @access  Protected (Helpdesk)
 */
export const prioritizeQueueAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const requesterId = req.user.id;
  const session = await mongoose.startSession();

  try {
    const requester = await User.findById(requesterId).select('role hospitalName');
    if (!requester || requester.role !== 'helpdesk') {
      return res.status(403).json({ message: 'Access denied. Helpdesk only.' });
    }

    const hospital = await Hospital.findOne({ name: requester.hospitalName }).select('_id');
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found.' });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    if (appointment.hospitalId.toString() !== hospital._id.toString()) {
      return res.status(403).json({ message: 'You can only prioritize appointments in your own hospital.' });
    }

    if (!['Scheduled', 'Rescheduled'].includes(appointment.status)) {
      return res.status(400).json({ message: 'Only scheduled appointments can be prioritized.' });
    }

    const queueDate = appointment.appointmentDate || new Date().toISOString().slice(0, 10);
    const queue = await Queue.findOne({
      hospitalId: hospital._id,
      doctorId: appointment.doctorId,
      date: queueDate,
      appointments: appointment._id,
    });

    if (!queue) {
      return res.status(404).json({ message: 'Queue for this appointment was not found.' });
    }

    const currentToken = Number(appointment.appointmentNumber) || 0;
    const currentServingToken = Number(queue.currentNumber) || 0;
    const frontToken = Math.max(currentServingToken + 1, 1);

    if (currentToken <= 0) {
      return res.status(400).json({ message: 'Invalid appointment token.' });
    }

    if (currentToken <= currentServingToken) {
      return res.status(400).json({ message: 'Appointment token has already been called or passed.' });
    }

    if (currentToken === frontToken) {
      return res.json({
        message: 'Appointment is already at highest available priority.',
        appointment,
        frontToken,
      });
    }

    await session.withTransaction(async () => {
      await Appointment.updateMany(
        {
          _id: { $in: queue.appointments, $ne: appointment._id },
          appointmentNumber: { $gte: frontToken, $lt: currentToken },
          status: { $in: ['Scheduled', 'Rescheduled'] },
        },
        { $inc: { appointmentNumber: 1 } },
        { session }
      );

      await Appointment.updateOne(
        { _id: appointment._id },
        { $set: { appointmentNumber: frontToken } },
        { session }
      );
    });

    const updatedAppointment = await Appointment.findById(appointment._id);

    const io = req.app.get('socketio');
    const roomId = queue._id.toString();

    const populatedQueue = await Queue.findById(queue._id).populate({
      path: 'appointments',
      select: 'patientName reasonForVisit appointmentNumber status patientPhone symptoms',
    });

    io.to(roomId).emit('new-appointment', populatedQueue);
    io.to(roomId).emit('queue-update', { currentNumber: queue.currentNumber });

    return res.json({
      message: `Appointment moved to token #${frontToken}.`,
      appointment: updatedAppointment,
      frontToken,
      queueId: queue._id,
    });
  } catch (error) {
    return res.status(500).json({ message: `Server Error: ${error.message}` });
  } finally {
    session.endSession();
  }
};