import Record from '../models/record.model.js';

export const uploadRecord = async (req, res) => {
  const { title, recordType } = req.body;
  const patientId = req.user.id;

  if (!title || !recordType) {
    return res.status(400).json({ message: 'Title and Record Type are required' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'Please upload a file' });
  }

  try {
    const newRecord = await Record.create({
      patientId,
      title,
      recordType,
      filePath: req.file.path,
    });
    res.status(201).json(newRecord);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

export const getMyRecords = async (req, res) => {
  try {
    const records = await Record.find({ patientId: req.user.id }).sort({ createdAt: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};