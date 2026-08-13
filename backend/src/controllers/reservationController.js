import sequelize from '../config/postgres.js';
import { Reservation, Venue } from '../models/sql/index.js';
import Notification from '../models/nosql/Notification.js';
import { rangesOverlap } from '../utils/availability.js';

async function notify(userId, type, message, metadata = {}) {
  await Notification.create({ userId, type, message, metadata });
}

export async function createReservation(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { venueId, date, startTime, endTime } = req.body;
    if (!venueId || !date || !startTime || !endTime) {
      await t.rollback();
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    const venue = await Venue.findByPk(venueId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!venue) {
      await t.rollback();
      return res.status(404).json({ message: 'Cancha no encontrada' });
    }

    // Bloqueamos las filas de reservas de esa cancha/fecha para evitar condiciones de carrera
    // y verificamos que el horario solicitado no se solape con una reserva activa existente.
    const sameDay = await Reservation.findAll({
      where: { venueId, date },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const overlaps = sameDay.some(
      (r) => r.status !== 'cancelled' && rangesOverlap(startTime, endTime, r.startTime, r.endTime)
    );
    if (overlaps) {
      await t.rollback();
      return res.status(409).json({ message: 'Ese horario ya está reservado' });
    }

    const [openH, openM] = startTime.split(':').map(Number);
    const [closeH, closeM] = endTime.split(':').map(Number);
    const hours = (closeH * 60 + closeM - (openH * 60 + openM)) / 60;
    const totalPrice = Number(venue.pricePerHour) * hours;

    const reservation = await Reservation.create({
      venueId, date, startTime, endTime, totalPrice,
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
    await t.rollback();
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

    const reservations = await Reservation.findAll({
      where: { venueId: venue.id },
      order: [['date', 'DESC'], ['startTime', 'DESC']],
    });
    res.json(reservations);
  } catch (err) {
    next(err);
  }
}

export async function confirmReservation(req, res, next) {
  try {
    const reservation = await Reservation.findByPk(req.params.id, {
      include: [{ model: Venue, as: 'venue' }],
    });
    if (!reservation) return res.status(404).json({ message: 'Reserva no encontrada' });
    if (reservation.venue.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'No eres el dueño de esta cancha' });
    }

    reservation.status = 'confirmed';
    await reservation.save();

    await notify(
      reservation.userId,
      'reservation_confirmed',
      `Tu reserva para "${reservation.venue.name}" el ${reservation.date} fue confirmada`,
      { reservationId: reservation.id }
    );

    res.json(reservation);
  } catch (err) {
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
