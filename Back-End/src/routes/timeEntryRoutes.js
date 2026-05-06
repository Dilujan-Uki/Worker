import express from 'express';
import {
  getEntries,
  startTimer,
  stopTimer,
  addManualEntry,
  deleteEntry,
  updateEntry,
} from '../controllers/timeEntryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // all time entry routes require auth

router.get('/', getEntries);
router.post('/start', startTimer);
router.post('/manual', addManualEntry);
router.patch('/:id/stop', stopTimer);
router.patch('/:id', updateEntry);
router.delete('/:id', deleteEntry);

export default router;
