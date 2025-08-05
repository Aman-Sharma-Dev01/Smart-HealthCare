import mongoose from 'mongoose';

const emergencySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  location: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true },
  },
  emergencyType: {
    type: String,
    enum: ['self', 'family', 'other'],
    required: true,
  },
  incidentType: {
    type: String,
    enum: ['accident', 'heart attack', 'fire', 'stroke', 'other'],
    required: true,
  },
  imagePath: { type: String },
  status: {
    type: String,
    enum: ['new', 'acknowledged', 'resolved'],
    default: 'new',
  },
  actionLog: [{ // New
    action: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const Emergency = mongoose.model('Emergency', emergencySchema);
export default Emergency;
