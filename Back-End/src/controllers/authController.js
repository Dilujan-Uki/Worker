import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ status: 'error', message: 'All fields are required' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ status: 'error', message: 'User already exists' });
    }

    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: { _id: user._id, name: user.name, email: user.email, token },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ status: 'error', message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: { _id: user._id, name: user.name, email: user.email, token },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    res.status(200).json({
      status: 'success',
      data: { _id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};
