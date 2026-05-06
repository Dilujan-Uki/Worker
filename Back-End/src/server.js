import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './routes/authRoutes.js';
import timeEntryRoutes from './routes/timeEntryRoutes.js';

const app = express();

// MIDDLEWARE
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// DATABASE
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log(' MongoDB Connected'))
  .catch((err) => console.error(' MongoDB Error:', err));

// ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/entries', timeEntryRoutes);

// HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({ status: 'success', message: 'Clockify API is running', timestamp: new Date() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found` });
});

// ERROR HANDLER
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
  console.log(` API available at http://localhost:${PORT}/api`);
});
