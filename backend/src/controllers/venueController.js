import { Op } from 'sequelize';
import { Venue, Schedule, Reservation, User } from '../models/sql/index.js';
import Review from '../models/nosql/Review.js';
import sequelize from '../config/postgres.js';
import { buildDaySlots, dayOfWeekOf, isValidDate, isValidTime, nowIn, VENUE_TZ } from '../utils/availability.js';

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
      // schedules: el panel del dueño edita el horario desde esta lista; sin ellos el editor
      // abría vacío y al guardar borraba todos los días que ya estaban configurados.
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name'] },
        { model: Schedule, as: 'schedules' },
      ],
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
    // pricePerHour puede ser 0 (cancha gratis), así que no alcanza con !pricePerHour
    if (!name || !sportType || !address || pricePerHour === undefined || pricePerHour === null || pricePerHour === '') {
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

    // El borrado arrastra (CASCADE) todas sus reservas: si hay alguna por venir, los
    // clientes la perderían sin aviso. Primero hay que cancelarlas.
    const upcoming = await Reservation.count({
      where: { venueId: venue.id, status: { [Op.ne]: 'cancelled' }, date: { [Op.gte]: nowIn(VENUE_TZ).date } },
    });
    if (upcoming > 0) {
      return res.status(409).json({ message: `La cancha tiene ${upcoming} reserva(s) por venir. Cancélalas antes de borrarla.` });
    }

    await venue.destroy();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

function scheduleError(schedules) {
  const seen = new Set();
  for (const s of schedules) {
    if (!s || !Number.isInteger(s.dayOfWeek) || s.dayOfWeek < 0 || s.dayOfWeek > 6) return 'dayOfWeek debe ser un entero de 0 (domingo) a 6';
    if (seen.has(s.dayOfWeek)) return 'Cada día puede aparecer una sola vez';
    seen.add(s.dayOfWeek);
    if (!isValidTime(s.openTime) || !isValidTime(s.closeTime)) return 'Las horas deben tener formato HH:MM';
    if (s.openTime >= s.closeTime) return 'La hora de cierre debe ser posterior a la de apertura';
  }
  return null;
}

export async function setSchedule(req, res, next) {
  try {
    const { venue, error, message } = await findOwnedVenue(req.params.id, req.user.id);
    if (error) return res.status(error).json({ message });

    const { schedules } = req.body;
    if (!Array.isArray(schedules)) {
      return res.status(400).json({ message: 'schedules debe ser un arreglo' });
    }
    const invalid = scheduleError(schedules);
    if (invalid) return res.status(400).json({ message: invalid });

    // Todo o nada: antes un día inválido fallaba después del destroy y la cancha
    // quedaba sin ningún horario.
    const created = await sequelize.transaction(async (t) => {
      await Schedule.destroy({ where: { venueId: venue.id }, transaction: t });
      return Schedule.bulkCreate(
        schedules.map(({ dayOfWeek, openTime, closeTime }) => ({ dayOfWeek, openTime, closeTime, venueId: venue.id })),
        { transaction: t }
      );
    });
    res.json(created);
  } catch (err) {
    next(err);
  }
}

export async function getAvailability(req, res, next) {
  try {
    const { date } = req.query;
    if (!isValidDate(date)) return res.status(400).json({ message: 'Debes indicar una fecha válida (date=YYYY-MM-DD)' });

    const venue = await Venue.findByPk(req.params.id, { include: [{ model: Schedule, as: 'schedules' }] });
    if (!venue) return res.status(404).json({ message: 'Cancha no encontrada' });

    const dayOfWeek = dayOfWeekOf(date);
    const schedule = venue.schedules.find((s) => s.dayOfWeek === dayOfWeek);

    const reservations = await Reservation.findAll({ where: { venueId: venue.id, date } });
    // Hoy (en Santo Domingo), los bloques que ya empezaron no se pueden reservar.
    const now = nowIn(VENUE_TZ);
    const slots = buildDaySlots(schedule, reservations).map((slot) => {
      const [h, m] = slot.startTime.split(':').map(Number);
      const past = date < now.date || (date === now.date && h * 60 + m <= now.minutes);
      return past ? { ...slot, available: false, past: true } : slot;
    });

    res.json({ date, slots });
  } catch (err) {
    next(err);
  }
}
