import sequelize from '../config/postgres.js';
import { Reservation, Venue, Schedule, User } from '../models/sql/index.js';
import Notification from '../models/nosql/Notification.js';
import { rangesOverlap, bookingError, dayOfWeekOf, hoursBetween, nowIn, VENUE_TZ } from '../utils/availability.js';

// Se llama después del commit: la reserva ya quedó guardada, así que una falla de Mongo
// no puede convertirse en un error para el usuario (antes el rollback sobre una transacción
// ya commiteada tiraba otra excepción que dejaba la request colgada o tumbaba el proceso).
async function notify(userId, type, message, metadata = {}) {
  try {
    await Notification.create({ userId, type, message, metadata });
  } catch (err) {
    console.error('No se pudo crear la notificación', type, err.message);
  }
}

async function rollback(t) {
  if (!t.finished) await t.rollback();
}

/** Otra reserva activa (pending/confirmed) que pisa el mismo horario, excluyendo `exceptId`. */
async function findOverlap({ venueId, date, startTime, endTime }, t, exceptId = null) {
  const sameDay = await Reservation.findAll({ where: { venueId, date }, transaction: t, lock: t.LOCK.UPDATE });
  return sameDay.find(
    (r) => r.id !== exceptId && r.status !== 'cancelled' && rangesOverlap(startTime, endTime, r.startTime, r.endTime)
  );
}

export async function createReservation(req, res, next) {
  let t;
  try {
    const { venueId, date, startTime, endTime } = req.body;
    if (!venueId || !date || !startTime || !endTime) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    t = await sequelize.transaction();
    // El lock de la cancha serializa las reservas concurrentes de la misma cancha.
    const venue = await Venue.findByPk(venueId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!venue) {
      await rollback(t);
      return res.status(404).json({ message: 'Cancha no encontrada' });
    }

    const schedule = await Schedule.findOne({ where: { venueId, dayOfWeek: dayOfWeekOf(date) }, transaction: t });
    const invalid = bookingError({ date, startTime, endTime }, schedule);
    if (invalid) {
      await rollback(t);
      return res.status(400).json({ message: invalid });
    }

    if (await findOverlap({ venueId, date, startTime, endTime }, t)) {
      await rollback(t);
      return res.status(409).json({ message: 'Ese horario ya está reservado' });
    }

    const reservation = await Reservation.create({
      venueId, date, startTime, endTime,
      totalPrice: Number(venue.pricePerHour) * hoursBetween(startTime, endTime),
      userId: req.user.id,
      status: 'pending',
    }, { transaction: t });

    await t.commit();

    await notify(
      venue.ownerId,
      'reservation_created',
      `Nueva reserva de ${req.user.name} para "${venue.name}" el ${date} de ${startTime} a ${endTime}`,
      { reservationId: reservation.id, venueId: venue.id }
    );

    res.status(201).json(reservation);
  } catch (err) {
    if (t) await rollback(t).catch(() => {});
    next(err);
  }
}

export async function myReservations(req, res, next) {
  try {
    const reservations = await Reservation.findAll({
      where: { userId: req.user.id },
      include: [{ model: Venue, as: 'venue', attributes: ['id', 'name', 'address', 'sportType', 'imageUrl'] }],
      order: [['date', 'DESC'], ['startTime', 'DESC']],
    });
    res.json(reservations);
  } catch (err) {
    next(err);
  }
}

export async function venueReservations(req, res, next) {
  try {
    const venue = await Venue.findByPk(req.params.venueId);
    if (!venue) return res.status(404).json({ message: 'Cancha no encontrada' });
    if (venue.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'No eres el dueño de esta cancha' });
    }

    // el dueño necesita saber quién reservó para confirmar o contactarlo
    const reservations = await Reservation.findAll({
      where: { venueId: venue.id },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
      order: [['date', 'DESC'], ['startTime', 'DESC']],
    });
    res.json(reservations);
  } catch (err) {
    next(err);
  }
}

export async function confirmReservation(req, res, next) {
  let t;
  try {
    t = await sequelize.transaction();
    const reservation = await Reservation.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!reservation) {
      await rollback(t);
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }
    // Mismo lock que al crear: así no se cruza con una reserva nueva del mismo horario.
    const venue = await Venue.findByPk(reservation.venueId, { transaction: t, lock: t.LOCK.UPDATE });
    if (venue.ownerId !== req.user.id) {
      await rollback(t);
      return res.status(403).json({ message: 'No eres el dueño de esta cancha' });
    }
    // Solo pending -> confirmed. Antes se podía "confirmar" una reserva ya cancelada
    // (por ejemplo desde un panel abierto hace rato) y quedaba doble reserva del horario.
    if (reservation.status !== 'pending') {
      await rollback(t);
      return res.status(409).json({ message: `La reserva ya está ${reservation.status === 'confirmed' ? 'confirmada' : 'cancelada'}` });
    }
    if (await findOverlap(reservation, t, reservation.id)) {
      await rollback(t);
      return res.status(409).json({ message: 'Ese horario ya está tomado por otra reserva' });
    }

    reservation.status = 'confirmed';
    await reservation.save({ transaction: t });
    await t.commit();

    await notify(
      reservation.userId,
      'reservation_confirmed',
      `Tu reserva para "${venue.name}" el ${reservation.date} fue confirmada`,
      { reservationId: reservation.id }
    );

    res.json({ ...reservation.toJSON(), venue: venue.toJSON() });
  } catch (err) {
    if (t) await rollback(t).catch(() => {});
    next(err);
  }
}

export async function cancelReservation(req, res, next) {
  try {
    const reservation = await Reservation.findByPk(req.params.id, {
      include: [{ model: Venue, as: 'venue' }],
    });
    if (!reservation) return res.status(404).json({ message: 'Reserva no encontrada' });

    const isClient = reservation.userId === req.user.id;
    const isVenueOwner = reservation.venue.ownerId === req.user.id;
    if (!isClient && !isVenueOwner) {
      return res.status(403).json({ message: 'No puedes cancelar esta reserva' });
    }
    if (reservation.status === 'cancelled') {
      return res.status(409).json({ message: 'La reserva ya está cancelada' });
    }
    if (reservation.date < nowIn(VENUE_TZ).date) {
      return res.status(409).json({ message: 'No se puede cancelar una reserva que ya pasó' });
    }

    reservation.status = 'cancelled';
    await reservation.save();

    const notifyUserId = isVenueOwner ? reservation.userId : reservation.venue.ownerId;
    await notify(
      notifyUserId,
      'reservation_cancelled',
      `La reserva para "${reservation.venue.name}" el ${reservation.date} fue cancelada`,
      { reservationId: reservation.id }
    );

    res.json(reservation);
  } catch (err) {
    next(err);
  }
}
