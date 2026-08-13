import { Op } from 'sequelize';
import { Venue, Schedule, Reservation, User } from '../models/sql/index.js';
import Review from '../models/nosql/Review.js';
import { buildDaySlots } from '../utils/availability.js';

async function attachRatings(venues) {
  const ids = venues.map((v) => v.id);
  const stats = await Review.aggregate([
    { $match: { venueId: { $in: ids } } },
    { $group: { _id: '$venueId', avgRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
  ]);
  const byId = Object.fromEntries(stats.map((s) => [s._id, s]));

  return venues.map((v) => {
    const plain = v.toJSON ? v.toJSON() : v;
    const stat = byId[v.id];
    return {
      ...plain,
      avgRating: stat ? Math.round(stat.avgRating * 10) / 10 : null,
      reviewCount: stat ? stat.reviewCount : 0,
    };
  });
}

export async function listVenues(req, res, next) {
  try {
    const { sportType, search } = req.query;
    const where = {};
    if (sportType) where.sportType = sportType;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const venues = await Venue.findAll({
      where,
      include: [{ model: User, as: 'owner', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
    });

    res.json(await attachRatings(venues));
  } catch (err) {
    next(err);
  }
}

export async function getVenue(req, res, next) {
  try {
    const venue = await Venue.findByPk(req.params.id, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name'] },
        { model: Schedule, as: 'schedules' },
      ],
    });
    if (!venue) return res.status(404).json({ message: 'Cancha no encontrada' });

    const [withRating] = await attachRatings([venue]);
    res.json(withRating);
  } catch (err) {
    next(err);
  }
}

export async function createVenue(req, res, next) {
  try {
    const { name, sportType, address, description, pricePerHour, imageUrl } = req.body;
    if (!name || !sportType || !address || !pricePerHour) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    const venue = await Venue.create({
      name, sportType, address, description, pricePerHour, imageUrl,
      ownerId: req.user.id,
    });
    res.status(201).json(venue);
  } catch (err) {
    next(err);
  }
}

async function findOwnedVenue(venueId, ownerId) {
  const venue = await Venue.findByPk(venueId);
  if (!venue) return { error: 404, message: 'Cancha no encontrada' };
  if (venue.ownerId !== ownerId) return { error: 403, message: 'No eres el dueño de esta cancha' };
  return { venue };
}

export async function updateVenue(req, res, next) {
  try {
    const { venue, error, message } = await findOwnedVenue(req.params.id, req.user.id);
    if (error) return res.status(error).json({ message });

    const { name, sportType, address, description, pricePerHour, imageUrl } = req.body;
    await venue.update({ name, sportType, address, description, pricePerHour, imageUrl });
    res.json(venue);
  } catch (err) {
    next(err);
  }
}

export async function deleteVenue(req, res, next) {
  try {
    const { venue, error, message } = await findOwnedVenue(req.params.id, req.user.id);
    if (error) return res.status(error).json({ message });

    await venue.destroy();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function setSchedule(req, res, next) {
  try {
    const { venue, error, message } = await findOwnedVenue(req.params.id, req.user.id);
    if (error) return res.status(error).json({ message });

    const { schedules } = req.body;
    if (!Array.isArray(schedules)) {
      return res.status(400).json({ message: 'schedules debe ser un arreglo' });
    }

    await Schedule.destroy({ where: { venueId: venue.id } });
    const created = await Schedule.bulkCreate(
      schedules.map((s) => ({ ...s, venueId: venue.id }))
    );
    res.json(created);
  } catch (err) {
    next(err);
  }
}

export async function getAvailability(req, res, next) {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Debes indicar una fecha (date=YYYY-MM-DD)' });

    const venue = await Venue.findByPk(req.params.id, { include: [{ model: Schedule, as: 'schedules' }] });
    if (!venue) return res.status(404).json({ message: 'Cancha no encontrada' });

    const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
    const schedule = venue.schedules.find((s) => s.dayOfWeek === dayOfWeek);

    const reservations = await Reservation.findAll({ where: { venueId: venue.id, date } });
    const slots = buildDaySlots(schedule, reservations);

    res.json({ date, slots });
  } catch (err) {
    next(err);
  }
}
