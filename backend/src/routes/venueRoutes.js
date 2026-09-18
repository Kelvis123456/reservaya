import { Router } from 'express';
import { body } from 'express-validator';
import {
  listVenues, getVenue, createVenue, updateVenue, deleteVenue, setSchedule, getAvailability,
} from '../controllers/venueController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { handleValidation } from '../middleware/validate.js';

const router = Router();

const createValidators = [
  body('name').trim().notEmpty().withMessage('El nombre es obligatorio'),
  body('sportType').trim().notEmpty().withMessage('El deporte es obligatorio'),
  body('address').trim().notEmpty().withMessage('La dirección es obligatoria'),
  body('pricePerHour').isFloat({ min: 0 }).withMessage('El precio por hora debe ser un número positivo'),
  body('imageUrl').optional({ values: 'falsy' }).isURL().withMessage('La URL de imagen no es válida'),
];

// En edición los campos son opcionales (permite actualizaciones parciales),
// pero si vienen, deben ser válidos.
const updateValidators = [
  body('name').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('sportType').optional().trim().notEmpty().withMessage('El deporte no puede estar vacío'),
  body('address').optional().trim().notEmpty().withMessage('La dirección no puede estar vacía'),
  body('pricePerHour').optional().isFloat({ min: 0 }).withMessage('El precio por hora debe ser un número positivo'),
  body('imageUrl').optional({ values: 'falsy' }).isURL().withMessage('La URL de imagen no es válida'),
];

router.get('/', listVenues);
router.get('/:id', getVenue);
router.get('/:id/availability', getAvailability);
router.post('/', requireAuth, requireRole('owner'), createValidators, handleValidation, createVenue);
router.put('/:id', requireAuth, requireRole('owner'), updateValidators, handleValidation, updateVenue);
router.delete('/:id', requireAuth, requireRole('owner'), deleteVenue);
router.put('/:id/schedule', requireAuth, requireRole('owner'), setSchedule);

export default router;
