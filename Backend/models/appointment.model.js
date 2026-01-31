import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Updated
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  appointmentNumber: { type: Number, required: true }, // Updated
  reasonForVisit: { type: String, required: true },
  symptoms: { type: String, default: '' },
  patientName: { type: String, required: true },
  patientPhone: { type: String, required: true },
  status: {
    type: String,
    enum: ['Scheduled', 'Completed', 'Cancelled', 'Missed', 'Rescheduled'],
    default: 'Scheduled',
  },
  // Appointment date (for scheduling on specific dates)
  appointmentDate: {
    type: String, // YYYY-MM-DD format
    default: function() {
      return new Date().toISOString().slice(0, 10);
    }
  },
  // For rescheduling
  rescheduledFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  rescheduledTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  // Patient feedback
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String },
    createdAt: { type: Date }
  },
  // Completion notes by doctor
  doctorNotes: { type: String },
  completedAt: { type: Date }
}, { timestamps: true });

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
