import mongoose from 'mongoose';

const queueSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
    date: { type: String, required: true }, // Storing date as YYYY-MM-DD string for easy lookup
    currentNumber: { type: Number, default: 0 },
    appointments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }],
    lastAppointmentNumber: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Ensure a hospital has only one queue per day
queueSchema.index({ hospitalId: 1, date: 1 }, { unique: true });

const Queue = mongoose.model('Queue', queueSchema);
export default Queue;