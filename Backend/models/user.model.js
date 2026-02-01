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
  // Doctor-specific fields
  isOnline: {
    type: Boolean,
    default: false
  },
  isTodayAvailable: {
    type: Boolean,
    default: false
  },
  availableDates: {
    type: [Date],
    default: []
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
