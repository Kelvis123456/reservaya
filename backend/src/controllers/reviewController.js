import Review from '../models/nosql/Review.js';
import Notification from '../models/nosql/Notification.js';
import { Venue, Reservation } from '../models/sql/index.js';

export async function createReview(req, res, next) {
  try {
    const { venueId, rating, comment, tags } = req.body;
    if (!venueId || !rating) {
      return res.status(400).json({ message: 'venueId y rating son obligatorios' });
    }

    const venue = await Venue.findByPk(venueId);
    if (!venue) return res.status(404).json({ message: 'Cancha no encontrada' });

    // Solo puede reseñar quien tuvo al menos una reserva confirmada en esa cancha.
    const hasReservation = await Reservation.findOne({
      where: { venueId, userId: req.user.id, status: 'confirmed' },
    });
    if (!hasReservation) {
      return res.status(403).json({ message: 'Debes tener una reserva confirmada en esta cancha para reseñarla' });
    }

    const review = await Review.create({
      venueId,
      userId: req.user.id,
      userName: req.user.name,
      rating,
      comment: comment || '',
      tags: Array.isArray(tags) ? tags : [],
    });

    await Notification.create({
      userId: venue.ownerId,
      type: 'review_received',
      message: `${req.user.name} dejó una reseña de ${rating}★ en "${venue.name}"`,
      metadata: { venueId: venue.id, reviewId: review._id },
    });

    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
}

export async function listVenueReviews(req, res, next) {
  try {
    const reviews = await Review.find({ venueId: Number(req.params.venueId) }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    next(err);
  }
}
