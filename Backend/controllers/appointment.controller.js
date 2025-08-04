import Appointment from '../models/appointment.model.js';
import Hospital from '../models/hospital.model.js';
import Queue from '../models/queue.model.js';
import User from '../models/user.model.js';

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
      patientId,
      doctorId,
      hospitalId,
      appointmentNumber: newAppointmentNumber,
      reasonForVisit,
      symptoms,
      patientName: patient.name,
      patientPhone: patient.phone,
    });

    queue.appointments.push(appointment._id);
    await appointment.save();
    await queue.save();

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
    
    // Find the hospitalId from the doctor's profile
    const hospital = await Hospital.findOne({ name: doctor.hospitalName });
    if (!hospital) return res.status(404).json({ message: 'Hospital not found.' });

    const today = new Date().toISOString().slice(0, 10);
    let queue = await Queue.findOne({ doctorId, date: today });
    if (!queue) {
      queue = new Queue({ hospitalId: hospital._id, doctorId, date: today });
    }

    const newAppointmentNumber = queue.lastAppointmentNumber + 1;
    queue.lastAppointmentNumber = newAppointmentNumber;

    const appointment = new Appointment({
      doctorId,
      hospitalId: hospital._id,
      appointmentNumber: newAppointmentNumber,
      patientName,
      patientPhone,
      reasonForVisit,
      symptoms,
    });

    queue.appointments.push(appointment._id);
    await appointment.save();
    await queue.save();

    res.status(201).json({ message: 'Offline appointment booked successfully.', appointment });
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};
