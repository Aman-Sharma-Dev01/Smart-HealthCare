import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

export const registerUser = async (req, res) => {
  const { name, email, password, phone, role, hospitalName, designation, gender } = req.body;

  if (!name || !email || !password || !phone || !role) {
    return res.status(400).json({ message: 'Please provide all required fields.' });
  }

  try {
    const userExists = await User.findOne({ $or: [{ email }, { phone }] });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email or phone already exists' });
    }

    const userData = { name, email, password, phone, role };

    // --- THIS IS THE CORRECTED LOGIC ---
    // If the role is either 'doctor' or 'helpdesk', hospitalName is required.
    if (role === 'doctor' || role === 'helpdesk') {
      if (!hospitalName) {
        return res.status(400).json({ message: 'Hospital Name is required for this role.' });
      }
      userData.hospitalName = hospitalName;

      // Designation and gender are only required for doctors.
      if (role === 'doctor') {
        if (!designation) {
          return res.status(400).json({ message: 'Designation is required for doctors.' });
        }
        if (!gender) {
          return res.status(400).json({ message: 'Gender is required for doctors.' });
        }
        userData.designation = designation;
        userData.gender = gender;
      }
    }

    const user = await User.create(userData);

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      const responsePayload = {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token: generateToken(user._id),
      };

      // If user is staff, include hospitalName in the response
      if (user.role === 'doctor' || user.role === 'helpdesk') {
        responsePayload.hospitalName = user.hospitalName;
      }
      // If user is a doctor, include gender in the response
      if (user.role === 'doctor') {
        responsePayload.gender = user.gender;
      }

      res.json(responsePayload);
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};
  