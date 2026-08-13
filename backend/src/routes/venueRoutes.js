import { Router } from 'express';
import {
  listVenues, getVenue, createVenue, updateVenue, deleteVenue, setSchedule, getAvailability,
} from '../controllers/venueController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', listVenues);
router.get('/:id', getVenue);
router.get('/:id/availability', getAvailability);
router.post('/', requireAuth, requireRole('owner'), createVenue);
router.put('/:id', requireAuth, requireRole('owner'), updateVenue);
router.delete('/:id', requireAuth, requireRole('owner'), deleteVenue);
router.put('/:id/schedule', requireAuth, requireRole('owner'), setSchedule);

export default router;
