import { Router } from 'express';
import { createReview, listVenueReviews } from '../controllers/reviewController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, requireRole('client'), createReview);
router.get('/venue/:venueId', listVenueReviews);

export default router;
