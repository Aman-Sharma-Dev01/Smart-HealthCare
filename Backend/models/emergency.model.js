import mongoose from 'mongoose';

const emergencySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  location: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
  // For whom the emergency is (self, family, etc.)
  emergencyType: {
    type: String,
    enum: ['self', 'family', 'other'],
    required: true,
  },
  // What the emergency is (accident, heart attack, etc.)
  incidentType: { // <-- NEW FIELD
    type: String,
    enum: ['accident', 'heart attack', 'fire', 'stroke', 'other'],
    required: true,
  },
  imagePath: { type: String }, // Optional path to an uploaded photo
  status: {
    type: String,
    enum: ['new', 'acknowledged', 'resolved'],
    default: 'new',
  },
}, { timestamps: true });

const Emergency = mongoose.model('Emergency', emergencySchema);
export default Emergency;
