import { Router } from 'express';
import authRoutes from './authRoutes.js';
import venueRoutes from './venueRoutes.js';
import reservationRoutes from './reservationRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import notificationRoutes from './notificationRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/venues', venueRoutes);
router.use('/reservations', reservationRoutes);
router.use('/reviews', reviewRoutes);
router.use('/notifications', notificationRoutes);

export default router;
