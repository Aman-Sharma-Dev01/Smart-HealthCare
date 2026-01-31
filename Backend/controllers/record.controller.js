import Record from '../models/record.model.js';
import User from '../models/user.model.js';
import { sendNewRecordNotification } from '../services/pushNotification.service.js';

export const uploadRecord = async (req, res) => {
  const { title, recordType } = req.body;
  const patientId = req.user.id;

  if (!req.file) {
    return res.status(400).json({ message: 'Please upload a file' });
  }
  // Check for upload error from middleware
  if (req.file.cloudStorageError) {
    return res.status(500).json({ message: 'Error uploading to cloud storage.' });
  }

  try {
    const newRecord = await Record.create({
      patientId,
      title,
      recordType,
      filePath: req.file.gcsUrl, // <-- Use the public URL from GCS middleware
    });
    res.status(201).json(newRecord);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

// Doctor uploads record for a patient
export const uploadRecordForPatient = async (req, res) => {
  const { title, recordType, patientId } = req.body;
  const doctorId = req.user.id;

  if (!req.file) {
    return res.status(400).json({ message: 'Please upload a file' });
  }
  
  if (req.file.cloudStorageError) {
    return res.status(500).json({ message: 'Error uploading to cloud storage.' });
  }

  if (!patientId) {
    return res.status(400).json({ message: 'Patient ID is required' });
  }

  try {
    // Verify the uploader is a doctor
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors can upload records for patients' });
    }

    const newRecord = await Record.create({
      patientId,
      title,
      recordType,
      filePath: req.file.gcsUrl,
      uploadedBy: doctorId,
    });

    // Send push notification to patient
    sendNewRecordNotification(patientId, doctor.name, recordType || title);

    res.status(201).json(newRecord);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

// getMyRecords function remains the same
export const getMyRecords = async (req, res) => {
  try {
    const records = await Record.find({ patientId: req.user.id }).sort({ createdAt: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};