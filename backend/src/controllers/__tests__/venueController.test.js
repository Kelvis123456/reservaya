import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  findByPk: venueFindByPk, findAll: venueFindAll, create: venueCreate,
} = vi.hoisted(() => ({ findByPk: vi.fn(), findAll: vi.fn(), create: vi.fn() }));
const { findAll: reservationFindAll } = vi.hoisted(() => ({ findAll: vi.fn() }));
const { destroy: scheduleDestroy, bulkCreate: scheduleBulkCreate } = vi.hoisted(() => ({
  destroy: vi.fn(), bulkCreate: vi.fn(),
}));
const { aggregate } = vi.hoisted(() => ({ aggregate: vi.fn() }));

vi.mock('../../models/sql/index.js', () => ({
  Venue: { findByPk: venueFindByPk, findAll: venueFindAll, create: venueCreate },
  Schedule: { destroy: scheduleDestroy, bulkCreate: scheduleBulkCreate },
  Reservation: { findAll: reservationFindAll },
  User: {},
}));
vi.mock('../../models/nosql/Review.js', () => ({ default: { aggregate } }));

const {
  listVenues, getVenue, createVenue, updateVenue, deleteVenue, setSchedule, getAvailability,
} = await import('../venueController.js');

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  venueFindByPk.mockReset();
  venueFindAll.mockReset();
  venueCreate.mockReset();
  reservationFindAll.mockReset();
  scheduleDestroy.mockReset();
  scheduleBulkCreate.mockReset();
  aggregate.mockReset().mockResolvedValue([]);
});

describe('listVenues', () => {
  it('attaches null rating and zero count to venues with no reviews', async () => {
    venueFindAll.mockResolvedValue([{ id: 1, toJSON: () => ({ id: 1, name: 'Cancha 1' }) }]);
    aggregate.mockResolvedValue([]);
    const req = { query: {} };
    const res = mockRes();
    const next = vi.fn();

    await listVenues(req, res, next);

    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ id: 1, avgRating: null, reviewCount: 0 }),
    ]);
  });

  it('rounds the average rating to one decimal place', async () => {
    venueFindAll.mockResolvedValue([{ id: 1, toJSON: () => ({ id: 1, name: 'Cancha 1' }) }]);
    aggregate.mockResolvedValue([{ _id: 1, avgRating: 4.666666, reviewCount: 3 }]);
    const req = { query: {} };
    const res = mockRes();
    const next = vi.fn();

    await listVenues(req, res, next);

    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ avgRating: 4.7, reviewCount: 3 }),
    ]);
  });

  it('forwards unexpected errors to next()', async () => {
    venueFindAll.mockRejectedValue(new Error('db down'));
    const req = { query: {} };
    const res = mockRes();
    const next = vi.fn();

    await listVenues(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('getVenue', () => {
  it('returns 404 when the venue does not exist', async () => {
    venueFindByPk.mockResolvedValue(null);
    const req = { params: { id: 999 } };
    const res = mockRes();
    const next = vi.fn();

    await getVenue(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('createVenue', () => {
  it.each([
    [{ sportType: 'futbol', address: 'x', pricePerHour: 10 }],
    [{ name: 'x', address: 'x', pricePerHour: 10 }],
    [{ name: 'x', sportType: 'futbol', pricePerHour: 10 }],
    [{ name: 'x', sportType: 'futbol', address: 'x' }],
  ])('rejects with 400 when a required field is missing (%j)', async (body) => {
    const req = { body, user: { id: 1 } };
    const res = mockRes();
    const next = vi.fn();

    await createVenue(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(venueCreate).not.toHaveBeenCalled();
  });

  it('creates the venue under the authenticated user as owner', async () => {
    venueCreate.mockResolvedValue({ id: 1 });
    const req = {
      body: { name: 'Cancha 1', sportType: 'futbol', address: 'Calle 1', pricePerHour: 15 },
      user: { id: 42 },
    };
    const res = mockRes();
    const next = vi.fn();

    await createVenue(req, res, next);

    expect(venueCreate).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 42 }));
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('updateVenue / deleteVenue (ownership checks)', () => {
  it('updateVenue returns 404 when the venue does not exist', async () => {
    venueFindByPk.mockResolvedValue(null);
    const req = { params: { id: 1 }, body: {}, user: { id: 1 } };
    const res = mockRes();
    const next = vi.fn();

    await updateVenue(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('updateVenue returns 403 when the requester is not the owner', async () => {
    venueFindByPk.mockResolvedValue({ id: 1, ownerId: 99, update: vi.fn() });
    const req = { params: { id: 1 }, body: {}, user: { id: 1 } };
    const res = mockRes();
    const next = vi.fn();

    await updateVenue(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('deleteVenue returns 403 when the requester is not the owner', async () => {
    venueFindByPk.mockResolvedValue({ id: 1, ownerId: 99, destroy: vi.fn() });
    const req = { params: { id: 1 }, user: { id: 1 } };
    const res = mockRes();
    const next = vi.fn();

    await deleteVenue(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('deleteVenue destroys the venue and returns 204 for the real owner', async () => {
    const destroy = vi.fn().mockResolvedValue(true);
    venueFindByPk.mockResolvedValue({ id: 1, ownerId: 1, destroy });
    const req = { params: { id: 1 }, user: { id: 1 } };
    const res = mockRes();
    const next = vi.fn();

    await deleteVenue(req, res, next);

    expect(destroy).toHaveBeenCalledOnce();
    expect(res.status).toHaveBeenCalledWith(204);
  });
});

describe('setSchedule', () => {
  it('rejects with 400 when schedules is not an array', async () => {
    venueFindByPk.mockResolvedValue({ id: 1, ownerId: 1 });
    const req = { params: { id: 1 }, body: { schedules: 'not-an-array' }, user: { id: 1 } };
    const res = mockRes();
    const next = vi.fn();

    await setSchedule(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(scheduleBulkCreate).not.toHaveBeenCalled();
  });

  it('replaces existing schedules for the venue', async () => {
    venueFindByPk.mockResolvedValue({ id: 1, ownerId: 1 });
    scheduleDestroy.mockResolvedValue(1);
    scheduleBulkCreate.mockResolvedValue([{ id: 1, venueId: 1, dayOfWeek: 1 }]);

    const req = {
      params: { id: 1 },
      body: { schedules: [{ dayOfWeek: 1, openTime: '09:00', closeTime: '18:00' }] },
      user: { id: 1 },
    };
    const res = mockRes();
    const next = vi.fn();

    await setSchedule(req, res, next);

    expect(scheduleDestroy).toHaveBeenCalledWith({ where: { venueId: 1 } });
    expect(res.json).toHaveBeenCalledWith([{ id: 1, venueId: 1, dayOfWeek: 1 }]);
  });
});

describe('getAvailability', () => {
  it('rejects with 400 when no date query param is given', async () => {
    const req = { params: { id: 1 }, query: {} };
    const res = mockRes();
    const next = vi.fn();

    await getAvailability(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when the venue does not exist', async () => {
    venueFindByPk.mockResolvedValue(null);
    const req = { params: { id: 999 }, query: { date: '2026-08-20' } };
    const res = mockRes();
    const next = vi.fn();

    await getAvailability(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns an empty slot list when there is no schedule configured for that day of week', async () => {
    venueFindByPk.mockResolvedValue({ id: 1, schedules: [{ dayOfWeek: 1, openTime: '09:00', closeTime: '18:00' }] });
    reservationFindAll.mockResolvedValue([]);
    // 2026-08-20 is a Thursday (dayOfWeek 4), no schedule matches dayOfWeek 1
    const req = { params: { id: 1 }, query: { date: '2026-08-20' } };
    const res = mockRes();
    const next = vi.fn();

    await getAvailability(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ date: '2026-08-20', slots: [] });
  });

  it('returns computed slots when a schedule matches the requested day', async () => {
    // 2026-08-22 is a Saturday (dayOfWeek 6)
    venueFindByPk.mockResolvedValue({ id: 1, schedules: [{ dayOfWeek: 6, openTime: '09:00', closeTime: '11:00' }] });
    reservationFindAll.mockResolvedValue([]);
    const req = { params: { id: 1 }, query: { date: '2026-08-22' } };
    const res = mockRes();
    const next = vi.fn();

    await getAvailability(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      date: '2026-08-22',
      slots: [
        { startTime: '09:00', endTime: '10:00', available: true },
        { startTime: '10:00', endTime: '11:00', available: true },
      ],
    });
  });
});
