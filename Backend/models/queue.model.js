import mongoose from 'mongoose';

const queueSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // <-- NEW
    date: { type: String, required: true }, // Storing date as YYYY-MM-DD
    currentNumber: { type: Number, default: 0 },
    appointments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }],
    lastAppointmentNumber: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// A doctor can only have one queue per day at a specific hospital
queueSchema.index({ hospitalId: 1, doctorId: 1, date: 1 }, { unique: true }); // <-- UPDATED

const Queue = mongoose.model('Queue', queueSchema);
export default Queue;