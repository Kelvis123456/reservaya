import { describe, it, expect, vi, beforeEach } from 'vitest';

const { create: reviewCreate } = vi.hoisted(() => ({ create: vi.fn() }));
const { find: reviewFind } = vi.hoisted(() => ({ find: vi.fn() }));
const { create: notificationCreate } = vi.hoisted(() => ({ create: vi.fn() }));
const { findByPk: venueFindByPk } = vi.hoisted(() => ({ findByPk: vi.fn() }));
const { findOne: reservationFindOne } = vi.hoisted(() => ({ findOne: vi.fn() }));

vi.mock('../../models/nosql/Review.js', () => ({
  default: {
    create: reviewCreate,
    find: reviewFind,
  },
}));
vi.mock('../../models/nosql/Notification.js', () => ({ default: { create: notificationCreate } }));
vi.mock('../../models/sql/index.js', () => ({
  Venue: { findByPk: venueFindByPk },
  Reservation: { findOne: reservationFindOne },
}));

const { createReview, listVenueReviews } = await import('../reviewController.js');

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  reviewCreate.mockReset();
  reviewFind.mockReset();
  notificationCreate.mockReset().mockResolvedValue({});
  venueFindByPk.mockReset();
  reservationFindOne.mockReset();
});

describe('createReview', () => {
  it('rejects with 400 when venueId or rating is missing', async () => {
    const req = { body: { rating: 5 }, user: { id: 1, name: 'K' } };
    const res = mockRes();
    const next = vi.fn();

    await createReview(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(reviewCreate).not.toHaveBeenCalled();
  });

  it('rejects with 404 when the venue does not exist', async () => {
    venueFindByPk.mockResolvedValue(null);
    const req = { body: { venueId: 1, rating: 5 }, user: { id: 1, name: 'K' } };
    const res = mockRes();
    const next = vi.fn();

    await createReview(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('rejects with 403 when the user has no confirmed reservation at the venue', async () => {
    venueFindByPk.mockResolvedValue({ id: 1, ownerId: 2, name: 'Cancha 1' });
    reservationFindOne.mockResolvedValue(null);
    const req = { body: { venueId: 1, rating: 5 }, user: { id: 1, name: 'K' } };
    const res = mockRes();
    const next = vi.fn();

    await createReview(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(reservationFindOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'confirmed' }) })
    );
    expect(reviewCreate).not.toHaveBeenCalled();
  });

  it('defaults comment to an empty string and tags to an empty array when omitted', async () => {
    venueFindByPk.mockResolvedValue({ id: 1, ownerId: 2, name: 'Cancha 1' });
    reservationFindOne.mockResolvedValue({ id: 1 });
    reviewCreate.mockResolvedValue({ _id: 'abc', rating: 5 });
    const req = { body: { venueId: 1, rating: 5 }, user: { id: 1, name: 'K' } };
    const res = mockRes();
    const next = vi.fn();

    await createReview(req, res, next);

    expect(reviewCreate).toHaveBeenCalledWith(
      expect.objectContaining({ comment: '', tags: [] })
    );
  });

  it('discards a non-array tags value instead of throwing', async () => {
    venueFindByPk.mockResolvedValue({ id: 1, ownerId: 2, name: 'Cancha 1' });
    reservationFindOne.mockResolvedValue({ id: 1 });
    reviewCreate.mockResolvedValue({ _id: 'abc', rating: 5 });
    const req = { body: { venueId: 1, rating: 5, tags: 'not-an-array' }, user: { id: 1, name: 'K' } };
    const res = mockRes();
    const next = vi.fn();

    await createReview(req, res, next);

    expect(reviewCreate).toHaveBeenCalledWith(expect.objectContaining({ tags: [] }));
  });

  it('notifies the venue owner, not the reviewer, when a review is created', async () => {
    venueFindByPk.mockResolvedValue({ id: 1, ownerId: 2, name: 'Cancha 1' });
    reservationFindOne.mockResolvedValue({ id: 1 });
    reviewCreate.mockResolvedValue({ _id: 'abc', rating: 5 });
    const req = { body: { venueId: 1, rating: 5 }, user: { id: 1, name: 'K' } };
    const res = mockRes();
    const next = vi.fn();

    await createReview(req, res, next);

    expect(notificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 2, type: 'review_received' })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('forwards unexpected errors to next()', async () => {
    venueFindByPk.mockRejectedValue(new Error('db down'));
    const req = { body: { venueId: 1, rating: 5 }, user: { id: 1, name: 'K' } };
    const res = mockRes();
    const next = vi.fn();

    await createReview(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('listVenueReviews', () => {
  it('coerces the venueId param to a number before querying', async () => {
    const sortFn = vi.fn().mockResolvedValue([]);
    reviewFind.mockReturnValue({ sort: sortFn });
    const req = { params: { venueId: '42' } };
    const res = mockRes();
    const next = vi.fn();

    await listVenueReviews(req, res, next);

    expect(reviewFind).toHaveBeenCalledWith({ venueId: 42 });
    expect(sortFn).toHaveBeenCalledWith({ createdAt: -1 });
  });

  it('forwards unexpected errors to next()', async () => {
    reviewFind.mockImplementation(() => { throw new Error('db down'); });
    const req = { params: { venueId: '1' } };
    const res = mockRes();
    const next = vi.fn();

    await listVenueReviews(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
