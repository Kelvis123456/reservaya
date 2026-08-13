import { Router } from 'express';
import { myNotifications, markAsRead } from '../controllers/notificationController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/me', requireAuth, myNotifications);
router.patch('/:id/read', requireAuth, markAsRead);

export default router;
