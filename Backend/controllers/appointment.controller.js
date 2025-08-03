import Appointment from '../models/appointment.model.js';
import Queue from '../models/queue.model.js';
import User from '../models/user.model.js';

export const bookAppointment = async (req, res) => {
  const { hospitalId, doctorId, reasonForVisit, symptoms } = req.body;
  const patientId = req.user.id;

  // Consistent UTC-based date string
  const today = new Date().toISOString().slice(0, 10);

  console.log('--- [BOOK APPOINTMENT] ---');
  console.log(`Attempting to book for Doctor ID: ${doctorId} on Date: ${today}`);

  try {
    const patient = await User.findById(patientId);

    // Find or create a queue for the specific DOCTOR for today
    let queue = await Queue.findOne({ hospitalId, doctorId, date: today });
    
    if (!queue) {
      console.log('DEBUG: No existing queue found. Creating a new one.');
      queue = new Queue({ hospitalId, doctorId, date: today });
    } else {
      console.log(`DEBUG: Found existing queue. Queue ID: ${queue._id}`);
    }

    const newAppointmentNumber = queue.lastAppointmentNumber + 1;
    queue.lastAppointmentNumber = newAppointmentNumber;

    const appointment = new Appointment({
      patientId,
      hospitalId,
      doctorId,
      appointmentNumber: newAppointmentNumber,
      reasonForVisit,
      symptoms,
      patientName: patient.name,
      patientPhone: patient.phone,
    });

    queue.appointments.push(appointment._id);

    await appointment.save();
    await queue.save();

    console.log(`DEBUG: Successfully saved Appointment ID: ${appointment._id} to Queue ID: ${queue._id}`);
    res.status(201).json(appointment);
  } catch (error) {
    console.error('SERVER ERROR during booking:', error);
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};
