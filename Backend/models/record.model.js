import mongoose from 'mongoose';

const recordSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  recordType: { type: String, required: true, trim: true }, // e.g., 'Blood Test', 'X-Ray', 'Prescription'
  filePath: { type: String, required: true }, // Path to the uploaded file
}, { timestamps: true });

const Record = mongoose.model('Record', recordSchema);
export default Record;