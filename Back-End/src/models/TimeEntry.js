import mongoose from 'mongoose';

const timeEntrySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  task: {
    type: String,
    required: [true, 'Task name is required'],
    trim: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    default: null,
  },
  duration: {
    // stored in seconds
    type: Number,
    default: 0,
  },
  isRunning: {
    type: Boolean,
    default: false,
  },
  createdAt: { type: Date, default: Date.now },
});

const TimeEntry = mongoose.model('TimeEntry', timeEntrySchema);
export default TimeEntry;
