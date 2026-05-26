import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import authRoutes from './routes/authRoutes.js';
import timeEntryRoutes from './routes/timeEntryRoutes.js';

// ── ERROR HANDLING (Top of file to catch all) ───────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('🔥 UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('💥 UNHANDLED REJECTION! Shutting down...');
  console.error(err);
  process.exit(1);
});

dotenv.config();
console.log(`📂 Current Working Directory: ${process.cwd()}`);
console.log(`🌐 Environment PORT: ${process.env.PORT}`);
console.log(`📦 Node Version: ${process.version}`);

// Polyfill globalThis.crypto for Node < 20 (webcrypto not exposed as a global until Node 20)
if (typeof globalThis.crypto === 'undefined') {
  console.log('🔧 Polyfilling globalThis.crypto');
  globalThis.crypto = crypto.webcrypto;
}

const app = express();

// ── CORS ───────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://clockify-frontend.diludj592.workers.dev',
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked for origin: ${origin}`);
      return callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── BODY PARSING ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ── ROUTES ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/entries', timeEntryRoutes);

// ── HEALTH CHECK ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'Clockify API is running',
    timestamp: new Date(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'connecting/error',
    env: {
      has_mongo: !!process.env.MONGODB_URI,
      has_jwt: !!process.env.JWT_SECRET,
      has_google: !!process.env.GOOGLE_CLIENT_ID,
    }
  });
});

// ── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found` });
});

// ── GLOBAL ERROR HANDLER ────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ── DATABASE ───────────────────────────────────────────────────────────────
if (!process.env.MONGODB_URI) {
  console.error('❌ CRITICAL: MONGODB_URI is not defined in environment variables!');
} else {
  console.log('⏳ Connecting to MongoDB...');
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch((err) => {
      console.error('❌ MongoDB Connection Error:', err.message);
    });
}

// ── SERVER START ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0')
  .on('listening', () => {
    const addr = server.address();
    const bind = typeof addr === 'string' ? `pipe ${addr}` : (addr ? `port ${addr.port}` : 'unknown port');
    console.log(`🚀 Server listening on ${bind}`);
    console.log(`📡 API available at /api`);
  })
  .on('error', (err) => {
    console.error('❌ Server Failed to Start:');
    console.error(err);
    process.exit(1);
  });
