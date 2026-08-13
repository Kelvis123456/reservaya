import { describe, it, expect, vi, beforeEach } from 'vitest';

const { find, findOneAndUpdate } = vi.hoisted(() => ({ find: vi.fn(), findOneAndUpdate: vi.fn() }));

vi.mock('../../models/nosql/Notification.js', () => ({ default: { find, findOneAndUpdate } }));

const { myNotifications, markAsRead } = await import('../notificationController.js');

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  find.mockReset();
  findOneAndUpdate.mockReset();
});

describe('myNotifications', () => {
  it('scopes the query to the authenticated user, sorted newest-first, capped at 50', async () => {
    const limitFn = vi.fn().mockResolvedValue([]);
    const sortFn = vi.fn().mockReturnValue({ limit: limitFn });
    find.mockReturnValue({ sort: sortFn });

    const req = { user: { id: 7 } };
    const res = mockRes();
    const next = vi.fn();

    await myNotifications(req, res, next);

    expect(find).toHaveBeenCalledWith({ userId: 7 });
    expect(sortFn).toHaveBeenCalledWith({ createdAt: -1 });
    expect(limitFn).toHaveBeenCalledWith(50);
  });

  it('forwards unexpected errors to next()', async () => {
    find.mockImplementation(() => { throw new Error('db down'); });
    const req = { user: { id: 7 } };
    const res = mockRes();
    const next = vi.fn();

    await myNotifications(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('markAsRead', () => {
  it('returns 404 when the notification does not exist or belongs to another user', async () => {
    findOneAndUpdate.mockResolvedValue(null);
    const req = { params: { id: 'abc' }, user: { id: 7 } };
    const res = mockRes();
    const next = vi.fn();

    await markAsRead(req, res, next);

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'abc', userId: 7 },
      { read: true },
      { new: true }
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns the updated notification on success', async () => {
    const updated = { _id: 'abc', userId: 7, read: true };
    findOneAndUpdate.mockResolvedValue(updated);
    const req = { params: { id: 'abc' }, user: { id: 7 } };
    const res = mockRes();
    const next = vi.fn();

    await markAsRead(req, res, next);

    expect(res.json).toHaveBeenCalledWith(updated);
  });

  it('forwards unexpected errors to next()', async () => {
    findOneAndUpdate.mockRejectedValue(new Error('db down'));
    const req = { params: { id: 'abc' }, user: { id: 7 } };
    const res = mockRes();
    const next = vi.fn();

    await markAsRead(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
