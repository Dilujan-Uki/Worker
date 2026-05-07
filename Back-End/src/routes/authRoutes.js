import express from 'express';
import { registerUser, loginUser, googleAuth, getProfile } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuth);           // Google OAuth endpoint
router.get('/profile', protect, getProfile);

export default router;
