import { describe, it, expect, vi, beforeEach } from 'vitest';

const { verifyToken } = vi.hoisted(() => ({ verifyToken: vi.fn() }));
const { findByPk } = vi.hoisted(() => ({ findByPk: vi.fn() }));

vi.mock('../../utils/jwt.js', () => ({ verifyToken }));
vi.mock('../../models/sql/index.js', () => ({ User: { findByPk } }));

const { requireAuth, requireRole } = await import('../auth.js');

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  verifyToken.mockReset();
  findByPk.mockReset();
});

describe('requireAuth', () => {
  it('rejects a request with no Authorization header', async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'No autenticado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a header that is not a Bearer token', async () => {
    const req = { headers: { authorization: 'Basic abc123' } };
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when the token is valid but the user no longer exists', async () => {
    verifyToken.mockReturnValue({ id: 99, role: 'client' });
    findByPk.mockResolvedValue(null);

    const req = { headers: { authorization: 'Bearer sometoken' } };
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Usuario no encontrado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when the token is invalid or expired', async () => {
    verifyToken.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    const req = { headers: { authorization: 'Bearer expiredtoken' } };
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Token inválido o expirado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches the user to req and calls next on success', async () => {
    const fakeUser = { id: 7, role: 'owner' };
    verifyToken.mockReturnValue({ id: 7, role: 'owner' });
    findByPk.mockResolvedValue(fakeUser);

    const req = { headers: { authorization: 'Bearer validtoken' } };
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(req.user).toBe(fakeUser);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('requireRole', () => {
  it('rejects when there is no authenticated user', () => {
    const req = {};
    const res = mockRes();
    const next = vi.fn();

    requireRole('owner')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when the user role is not in the allowed list', () => {
    const req = { user: { role: 'client' } };
    const res = mockRes();
    const next = vi.fn();

    requireRole('owner')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'No tienes permisos para esta acción' });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows the request when the user role matches one of several allowed roles', () => {
    const req = { user: { role: 'owner' } };
    const res = mockRes();
    const next = vi.fn();

    requireRole('client', 'owner')(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
