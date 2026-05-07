import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Token helper ───────────────────────────────────────────────────────────
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const buildUserPayload = (user, token) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar || null,
  token,
});

// ── REGISTER ───────────────────────────────────────────────────────────────
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ status: 'error', message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.googleId && !existingUser.password) {
        return res.status(400).json({
          status: 'error',
          message: 'This email is linked to a Google account. Please sign in with Google.',
        });
      }
      return res.status(400).json({ status: 'error', message: 'User already exists' });
    }

    // Hash password in the controller — Mongoose v9 pre-save async hooks
    // do not guarantee the mutation is persisted before the document is serialized.
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({ name, email, password: hashedPassword });
    const token = generateToken(user._id);

    return res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: buildUserPayload(user, token),
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ status: 'error', message: error.message });
    }
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ── LOGIN ──────────────────────────────────────────────────────────────────
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

    // User exists but has no password (Google-only account)
    if (!user.password) {
      return res.status(401).json({
        status: 'error',
        message: 'This account uses Google Sign-In. Please sign in with Google.',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: buildUserPayload(user, token),
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ── GOOGLE OAUTH ───────────────────────────────────────────────────────────
export const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ status: 'error', message: 'Google credential is required' });
    }

    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      console.error('Google token verification failed:', verifyError.message);
      return res.status(401).json({ status: 'error', message: 'Invalid Google credential' });
    }

    const { sub: googleId, email, name, picture: avatar } = payload;

    if (!email) {
      return res.status(400).json({ status: 'error', message: 'Google account has no email' });
    }

    let user = await User.findOne({ email });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        if (!user.avatar && avatar) user.avatar = avatar;
        await user.save();
      }
    } else {
      user = await User.create({
        name,
        email,
        googleId,
        avatar,
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      status: 'success',
      message: 'Google authentication successful',
      data: buildUserPayload(user, token),
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ── GET PROFILE ────────────────────────────────────────────────────────────
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    return res.status(200).json({
      status: 'success',
      data: buildUserPayload(user, null),
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};
