import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findByPk: venueFindByPk } = vi.hoisted(() => ({ findByPk: vi.fn() }));
const { findByPk: reservationFindByPk, findAll: reservationFindAll, create: reservationCreate } = vi.hoisted(() => ({
  findByPk: vi.fn(), findAll: vi.fn(), create: vi.fn(),
}));
const { create: notificationCreate } = vi.hoisted(() => ({ create: vi.fn() }));
const { transaction } = vi.hoisted(() => ({ transaction: vi.fn() }));

vi.mock('../../config/postgres.js', () => ({ default: { transaction } }));
vi.mock('../../models/sql/index.js', () => ({
  Venue: { findByPk: venueFindByPk },
  Reservation: { findByPk: reservationFindByPk, findAll: reservationFindAll, create: reservationCreate },
}));
vi.mock('../../models/nosql/Notification.js', () => ({ default: { create: notificationCreate } }));

const {
  createReservation, confirmReservation, cancelReservation, venueReservations,
} = await import('../reservationController.js');

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function fakeTransaction() {
  return { rollback: vi.fn(), commit: vi.fn(), LOCK: { UPDATE: 'UPDATE' } };
}

beforeEach(() => {
  venueFindByPk.mockReset();
  reservationFindByPk.mockReset();
  reservationFindAll.mockReset();
  reservationCreate.mockReset();
  notificationCreate.mockReset().mockResolvedValue({});
  transaction.mockReset();
});

describe('createReservation', () => {
  it('rolls back and returns 400 when required fields are missing', async () => {
    const t = fakeTransaction();
    transaction.mockResolvedValue(t);
    const req = { body: { venueId: 1 }, user: { id: 5, name: 'Kelvis' } };
    const res = mockRes();
    const next = vi.fn();

    await createReservation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(t.rollback).toHaveBeenCalledOnce();
    expect(t.commit).not.toHaveBeenCalled();
  });

  it('rolls back and returns 404 when the venue does not exist', async () => {
    const t = fakeTransaction();
    transaction.mockResolvedValue(t);
    venueFindByPk.mockResolvedValue(null);

    const req = {
      body: { venueId: 999, date: '2026-08-20', startTime: '09:00', endTime: '10:00' },
      user: { id: 5, name: 'Kelvis' },
    };
    const res = mockRes();
    const next = vi.fn();

    await createReservation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(t.rollback).toHaveBeenCalledOnce();
  });

  it('rolls back and returns 409 when the requested slot overlaps an active reservation', async () => {
    const t = fakeTransaction();
    transaction.mockResolvedValue(t);
    venueFindByPk.mockResolvedValue({ id: 1, ownerId: 2, pricePerHour: 20, name: 'Cancha 1' });
    reservationFindAll.mockResolvedValue([
      { status: 'confirmed', startTime: '09:00', endTime: '10:00' },
    ]);

    const req = {
      body: { venueId: 1, date: '2026-08-20', startTime: '09:30', endTime: '10:30' },
      user: { id: 5, name: 'Kelvis' },
    };
    const res = mockRes();
    const next = vi.fn();

    await createReservation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(t.rollback).toHaveBeenCalledOnce();
    expect(reservationCreate).not.toHaveBeenCalled();
  });

  it('ignores cancelled reservations when checking for overlaps', async () => {
    const t = fakeTransaction();
    transaction.mockResolvedValue(t);
    venueFindByPk.mockResolvedValue({ id: 1, ownerId: 2, pricePerHour: 20, name: 'Cancha 1' });
    reservationFindAll.mockResolvedValue([
      { status: 'cancelled', startTime: '09:00', endTime: '10:00' },
    ]);
    reservationCreate.mockResolvedValue({ id: 10, venueId: 1, date: '2026-08-20', startTime: '09:00', endTime: '10:00' });

    const req = {
      body: { venueId: 1, date: '2026-08-20', startTime: '09:00', endTime: '10:00' },
      user: { id: 5, name: 'Kelvis' },
    };
    const res = mockRes();
    const next = vi.fn();

    await createReservation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(t.commit).toHaveBeenCalledOnce();
  });

  it('computes totalPrice from the venue hourly rate and the requested duration', async () => {
    const t = fakeTransaction();
    transaction.mockResolvedValue(t);
    venueFindByPk.mockResolvedValue({ id: 1, ownerId: 2, pricePerHour: '20.00', name: 'Cancha 1' });
    reservationFindAll.mockResolvedValue([]);
    reservationCreate.mockImplementation(async (data) => ({ id: 10, ...data }));

    const req = {
      body: { venueId: 1, date: '2026-08-20', startTime: '09:00', endTime: '11:00' },
      user: { id: 5, name: 'Kelvis' },
    };
    const res = mockRes();
    const next = vi.fn();

    await createReservation(req, res, next);

    expect(reservationCreate).toHaveBeenCalledWith(
      expect.objectContaining({ totalPrice: 40 }),
      expect.anything()
    );
  });

  it('notifies the venue owner after committing', async () => {
    const t = fakeTransaction();
    transaction.mockResolvedValue(t);
    venueFindByPk.mockResolvedValue({ id: 1, ownerId: 2, pricePerHour: 20, name: 'Cancha 1' });
    reservationFindAll.mockResolvedValue([]);
    reservationCreate.mockResolvedValue({ id: 10, venueId: 1, date: '2026-08-20', startTime: '09:00', endTime: '10:00' });

    const req = {
      body: { venueId: 1, date: '2026-08-20', startTime: '09:00', endTime: '10:00' },
      user: { id: 5, name: 'Kelvis' },
    };
    const res = mockRes();
    const next = vi.fn();

    await createReservation(req, res, next);

    expect(notificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 2, type: 'reservation_created' })
    );
  });

  it('rolls back and forwards the error to next() when something throws', async () => {
    const t = fakeTransaction();
    transaction.mockResolvedValue(t);
    venueFindByPk.mockRejectedValue(new Error('connection lost'));

    const req = {
      body: { venueId: 1, date: '2026-08-20', startTime: '09:00', endTime: '10:00' },
      user: { id: 5, name: 'Kelvis' },
    };
    const res = mockRes();
    const next = vi.fn();

    await createReservation(req, res, next);

    expect(t.rollback).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('venueReservations', () => {
  it('returns 404 when the venue does not exist', async () => {
    venueFindByPk.mockResolvedValue(null);
    const req = { params: { venueId: 1 }, user: { id: 2 } };
    const res = mockRes();
    const next = vi.fn();

    await venueReservations(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 when the requester does not own the venue', async () => {
    venueFindByPk.mockResolvedValue({ id: 1, ownerId: 99 });
    const req = { params: { venueId: 1 }, user: { id: 2 } };
    const res = mockRes();
    const next = vi.fn();

    await venueReservations(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('confirmReservation', () => {
  it('returns 404 when the reservation does not exist', async () => {
    reservationFindByPk.mockResolvedValue(null);
    const req = { params: { id: 1 }, user: { id: 2 } };
    const res = mockRes();
    const next = vi.fn();

    await confirmReservation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 when the requester is not the venue owner', async () => {
    reservationFindByPk.mockResolvedValue({ id: 1, venue: { ownerId: 99 }, save: vi.fn() });
    const req = { params: { id: 1 }, user: { id: 2 } };
    const res = mockRes();
    const next = vi.fn();

    await confirmReservation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('confirms the reservation and notifies the client on success', async () => {
    const reservation = {
      id: 1, userId: 5, date: '2026-08-20', status: 'pending',
      venue: { ownerId: 2, name: 'Cancha 1' },
      save: vi.fn().mockResolvedValue(true),
    };
    reservationFindByPk.mockResolvedValue(reservation);
    const req = { params: { id: 1 }, user: { id: 2 } };
    const res = mockRes();
    const next = vi.fn();

    await confirmReservation(req, res, next);

    expect(reservation.status).toBe('confirmed');
    expect(reservation.save).toHaveBeenCalledOnce();
    expect(notificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 5, type: 'reservation_confirmed' })
    );
    expect(res.json).toHaveBeenCalledWith(reservation);
  });
});

describe('cancelReservation', () => {
  it('returns 404 when the reservation does not exist', async () => {
    reservationFindByPk.mockResolvedValue(null);
    const req = { params: { id: 1 }, user: { id: 2 } };
    const res = mockRes();
    const next = vi.fn();

    await cancelReservation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('rejects a third party who is neither the client nor the venue owner', async () => {
    reservationFindByPk.mockResolvedValue({
      id: 1, userId: 5, venue: { ownerId: 2 }, save: vi.fn(),
    });
    const req = { params: { id: 1 }, user: { id: 999 } };
    const res = mockRes();
    const next = vi.fn();

    await cancelReservation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows the client who booked it to cancel and notifies the venue owner', async () => {
    const reservation = {
      id: 1, userId: 5, date: '2026-08-20', status: 'confirmed',
      venue: { ownerId: 2, name: 'Cancha 1' },
      save: vi.fn().mockResolvedValue(true),
    };
    reservationFindByPk.mockResolvedValue(reservation);
    const req = { params: { id: 1 }, user: { id: 5 } };
    const res = mockRes();
    const next = vi.fn();

    await cancelReservation(req, res, next);

    expect(reservation.status).toBe('cancelled');
    expect(notificationCreate).toHaveBeenCalledWith(expect.objectContaining({ userId: 2 }));
  });

  it('allows the venue owner to cancel and notifies the client instead', async () => {
    const reservation = {
      id: 1, userId: 5, date: '2026-08-20', status: 'confirmed',
      venue: { ownerId: 2, name: 'Cancha 1' },
      save: vi.fn().mockResolvedValue(true),
    };
    reservationFindByPk.mockResolvedValue(reservation);
    const req = { params: { id: 1 }, user: { id: 2 } };
    const res = mockRes();
    const next = vi.fn();

    await cancelReservation(req, res, next);

    expect(reservation.status).toBe('cancelled');
    expect(notificationCreate).toHaveBeenCalledWith(expect.objectContaining({ userId: 5 }));
  });
});
