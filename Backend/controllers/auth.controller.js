import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

export const registerUser = async (req, res) => {
  const { name, email, password, phone, role, hospitalName, designation } = req.body;

  if (!name || !email || !password || !phone || !role) {
    return res.status(400).json({ message: 'Please provide all required fields: name, email, password, phone, and role.' });
  }

  try {
    const userExists = await User.findOne({ $or: [{ email }, { phone }] });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email or phone already exists' });
    }

    const userData = { name, email, password, phone, role };

    if (role === 'doctor') {
      if (!hospitalName || !designation) {
        return res.status(400).json({ message: 'Hospital Name and Designation are required for doctors' });
      }
      userData.hospitalName = hospitalName;
      userData.designation = designation;
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
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};