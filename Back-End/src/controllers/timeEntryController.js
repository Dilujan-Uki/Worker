import TimeEntry from '../models/TimeEntry.js';

// GET all entries for user
export const getEntries = async (req, res) => {
  try {
    const entries = await TimeEntry.find({ user: req.userId }).sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', data: entries });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// START a new timer
export const startTimer = async (req, res) => {
  try {
    const { task } = req.body;

    if (!task || !task.trim()) {
      return res.status(400).json({ status: 'error', message: 'Task name is required' });
    }

    // Stop any currently running timer for this user
    const runningTimers = await TimeEntry.find({ user: req.userId, isRunning: true });
    for (const timer of runningTimers) {
      timer.isRunning = false;
      timer.endTime = new Date();
      timer.duration = Math.floor((timer.endTime - timer.startTime) / 1000);
      await timer.save();
    }

    const entry = await TimeEntry.create({
      user: req.userId,
      task: task.trim(),
      startTime: new Date(),
      isRunning: true,
    });

    res.status(201).json({ status: 'success', data: entry });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// STOP a running timer 
export const stopTimer = async (req, res) => {
  try {
    const entry = await TimeEntry.findOne({ _id: req.params.id, user: req.userId });

    if (!entry) {
      return res.status(404).json({ status: 'error', message: 'Entry not found' });
    }

    if (!entry.isRunning) {
      return res.status(400).json({ status: 'error', message: 'Timer is not running' });
    }

    const endTime = new Date();
    const duration = Math.floor((endTime - entry.startTime) / 1000);

    entry.endTime = endTime;
    entry.duration = duration;
    entry.isRunning = false;
    await entry.save();

    res.status(200).json({ status: 'success', data: entry });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ADD a manual entry
export const addManualEntry = async (req, res) => {
  try {
    const { task, startTime, endTime } = req.body;

    if (!task || !startTime || !endTime) {
      return res.status(400).json({ status: 'error', message: 'Task, start time and end time are required' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      return res.status(400).json({ status: 'error', message: 'End time must be after start time' });
    }

    const duration = Math.floor((end - start) / 1000);

    const entry = await TimeEntry.create({
      user: req.userId,
      task: task.trim(),
      startTime: start,
      endTime: end,
      duration,
      isRunning: false,
    });

    res.status(201).json({ status: 'success', data: entry });
  } catch (error) {
    console.error('Add manual entry error:', error);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// DELETE an entry
export const deleteEntry = async (req, res) => {
  try {
    const entry = await TimeEntry.findOneAndDelete({ _id: req.params.id, user: req.userId });

    if (!entry) {
      return res.status(404).json({ status: 'error', message: 'Entry not found' });
    }

    res.status(200).json({ status: 'success', message: 'Entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// UPDATE entry task name
export const updateEntry = async (req, res) => {
  try {
    const { task } = req.body;

    if (!task || !task.trim()) {
      return res.status(400).json({ status: 'error', message: 'Task name is required' });
    }

    const entry = await TimeEntry.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { task: task.trim() },
      { new: true }
    );

    if (!entry) {
      return res.status(404).json({ status: 'error', message: 'Entry not found' });
    }

    res.status(200).json({ status: 'success', data: entry });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};
