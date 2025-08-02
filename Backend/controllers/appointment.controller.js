import Appointment from '../models/appointment.model.js';
import Queue from '../models/queue.model.js';

export const bookAppointment = async (req, res) => {
  const { hospitalId } = req.body;
  const patientId = req.user.id; // From auth middleware

  if (!hospitalId) {
    return res.status(400).json({ message: 'Hospital ID is required' });
  }

  try {
    const today = new Date().toISOString().slice(0, 10); // Format YYYY-MM-DD

    // Find or create a queue for the hospital for today
    let queue = await Queue.findOne({ hospitalId, date: today });
    if (!queue) {
      queue = new Queue({ hospitalId, date: today });
    }

    // Generate the next appointment number
    const newAppointmentNumber = queue.lastAppointmentNumber + 1;
    queue.lastAppointmentNumber = newAppointmentNumber;

    // Create the new appointment
    const appointment = new Appointment({
      patientId,
      hospitalId,
      appointmentNumber: newAppointmentNumber,
    });

    // Add appointment to the queue
    queue.appointments.push(appointment._id);

    // Save both documents
    await appointment.save();
    await queue.save();

    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};