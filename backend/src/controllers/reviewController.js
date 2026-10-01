import Review from '../models/nosql/Review.js';
import Notification from '../models/nosql/Notification.js';
import { Op } from 'sequelize';
import { Venue, Reservation } from '../models/sql/index.js';
import { nowIn, VENUE_TZ } from '../utils/availability.js';

const MAX_TAGS = 5, MAX_TAG = 30, MAX_COMMENT = 1000;

export async function createReview(req, res, next) {
  try {
    const { venueId, rating, comment, tags } = req.body;
    if (!venueId || rating === undefined) {
      return res.status(400).json({ message: 'venueId y rating son obligatorios' });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'La calificación debe ser un entero del 1 al 5' });
    }
    if (comment !== undefined && (typeof comment !== 'string' || comment.length > MAX_COMMENT)) {
      return res.status(400).json({ message: `El comentario debe ser texto de hasta ${MAX_COMMENT} caracteres` });
    }
    const cleanTags = Array.isArray(tags)
      ? tags.filter((x) => typeof x === 'string').map((x) => x.trim().slice(0, MAX_TAG)).filter(Boolean).slice(0, MAX_TAGS)
      : [];

    const venue = await Venue.findByPk(venueId);
    if (!venue) return res.status(404).json({ message: 'Cancha no encontrada' });

    // Solo quien ya jugó: una reserva confirmada con fecha pasada (antes bastaba una
    // reserva confirmada futura, y además se podían dejar reseñas sin límite).
    const played = await Reservation.findOne({
      where: { venueId, userId: req.user.id, status: 'confirmed', date: { [Op.lt]: nowIn(VENUE_TZ).date } },
    });
    if (!played) {
      return res.status(403).json({ message: 'Podrás reseñar esta cancha después de jugar una reserva confirmada' });
    }
    if (await Review.exists({ venueId: Number(venueId), userId: req.user.id })) {
      return res.status(409).json({ message: 'Ya dejaste una reseña para esta cancha' });
    }

    const review = await Review.create({
      venueId,
      userId: req.user.id,
      userName: req.user.name,
      rating,
      comment: comment || '',
      tags: cleanTags,
    });

    await Notification.create({
      userId: venue.ownerId,
      type: 'review_received',
      message: `${req.user.name} dejó una reseña de ${rating}★ en "${venue.name}"`,
      metadata: { venueId: venue.id, reviewId: review._id },
    });

    res.status(201).json(review);
  } catch (err) {
    // dos envíos simultáneos: el índice único frena el segundo
    if (err?.code === 11000) return res.status(409).json({ message: 'Ya dejaste una reseña para esta cancha' });
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
