import { Router } from 'express';
import {
  createReservation, myReservations, venueReservations, confirmReservation, cancelReservation,
} from '../controllers/reservationController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, requireRole('client'), createReservation);
router.get('/me', requireAuth, myReservations);
router.get('/venue/:venueId', requireAuth, requireRole('owner'), venueReservations);
router.patch('/:id/confirm', requireAuth, requireRole('owner'), confirmReservation);
router.patch('/:id/cancel', requireAuth, cancelReservation);

export default router;
