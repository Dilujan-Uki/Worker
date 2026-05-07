import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  // password is optional — Google OAuth users won't have one
  // Password is hashed in authController before saving (Mongoose v9 pre-save
  // async hooks have a serialization race that prevents in-hook mutations from persisting)
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters'],
    default: null,
  },
  // Google OAuth fields
  googleId: {
    type: String,
    default: null,
    sparse: true,
  },
  avatar: {
    type: String,
    default: null,
  },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
export default User;
