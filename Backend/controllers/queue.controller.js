import Queue from '../models/queue.model.js';
import Appointment from '../models/appointment.model.js';

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
  
  try {
    const queue = await Queue.findById(queueId);
    if (!queue) {
      return res.status(404).json({ message: 'Queue not found.' });
    }

    // Prevent advancing beyond the last patient
    if (queue.currentNumber >= queue.lastAppointmentNumber) {
      return res.status(400).json({ message: 'End of queue reached. No more patients.' });
    }
    
    // Optional: Mark the appointment just served as 'Completed'
    if (queue.currentNumber > 0) {
      const appointmentToComplete = await Appointment.findOne({
        _id: { $in: queue.appointments },
        appointmentNumber: queue.currentNumber
      });

      if (appointmentToComplete) {
        appointmentToComplete.status = 'Completed';
        await appointmentToComplete.save();
      }
    }
    
    queue.currentNumber += 1;
    await queue.save();

    const io = req.app.get('socketio');
    const roomId = queue._id.toString();
    io.to(roomId).emit('queue-update', {
      currentNumber: queue.currentNumber,
    });
    
    res.json({
      message: 'Queue advanced successfully',
      queue: queue
    });

  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};
