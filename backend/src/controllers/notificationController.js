import Notification from '../models/nosql/Notification.js';

export async function myNotifications(req, res, next) {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50);
    res.json(notifications);
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req, res, next) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notificación no encontrada' });
    res.json(notification);
  } catch (err) {
    next(err);
  }
}
