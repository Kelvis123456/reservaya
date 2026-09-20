import { Router } from 'express';
import { body } from 'express-validator';
import {
  createReservation, myReservations, venueReservations, confirmReservation, cancelReservation,
} from '../controllers/reservationController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { handleValidation } from '../middleware/validate.js';

const router = Router();

const createValidators = [
  body('venueId').notEmpty().withMessage('Debes indicar la cancha a reservar'),
  body('date').isISO8601().withMessage('La fecha debe tener formato YYYY-MM-DD'),
  body('startTime').matches(/^\d{2}:\d{2}$/).withMessage('La hora de inicio debe tener formato HH:MM'),
  body('endTime').matches(/^\d{2}:\d{2}$/).withMessage('La hora de fin debe tener formato HH:MM'),
];

router.post('/', requireAuth, requireRole('client'), createValidators, handleValidation, createReservation);
router.get('/me', requireAuth, myReservations);
router.get('/venue/:venueId', requireAuth, requireRole('owner'), venueReservations);
router.patch('/:id/confirm', requireAuth, requireRole('owner'), confirmReservation);
router.patch('/:id/cancel', requireAuth, cancelReservation);

export default router;
