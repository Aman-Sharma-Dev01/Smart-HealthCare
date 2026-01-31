import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  role: {
    type: String,
    enum: ['patient', 'doctor', 'helpdesk'], // Updated
    default: 'patient',
  },
  hospitalName: {
    type: String,
    // Updated: Required if the role is 'doctor' or 'helpdesk'
    required: function() { return this.role === 'doctor' || this.role === 'helpdesk'; }
  },
  designation: {
    type: String,
    required: function() { return this.role === 'doctor'; }
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: function() { return this.role === 'doctor'; }
  },
  // Doctor-specific profile fields
  profileCompleted: {
    type: Boolean,
    default: false
  },
  specialization: { type: String },
  experience: { type: Number }, // Years of experience
  education: { type: String },
  consultationFee: { type: Number },
  bio: { type: String },
  languages: [{ type: String }],
  profileImage: { type: String },
  // Doctor availability settings
  isOnline: {
    type: Boolean,
    default: false
  },
  isAvailableToday: {
    type: Boolean,
    default: false
  },
  availableDates: [{ type: String }], // Array of YYYY-MM-DD strings
  // Doctor rating and feedback
  averageRating: {
    type: Number,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
