import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findOne, create } = vi.hoisted(() => ({ findOne: vi.fn(), create: vi.fn() }));
const { hash, compare } = vi.hoisted(() => ({ hash: vi.fn(), compare: vi.fn() }));
const { signToken } = vi.hoisted(() => ({ signToken: vi.fn() }));

vi.mock('../../models/sql/index.js', () => ({ User: { findOne, create } }));
vi.mock('bcryptjs', () => ({ default: { hash, compare } }));
vi.mock('../../utils/jwt.js', () => ({ signToken }));

const { register, login, me } = await import('../authController.js');

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  findOne.mockReset();
  create.mockReset();
  hash.mockReset();
  compare.mockReset();
  signToken.mockReset().mockReturnValue('signed.jwt.token');
});

describe('register', () => {
  it('rejects when required fields are missing', async () => {
    const req = { body: { name: 'Kelvis' } };
    const res = mockRes();
    const next = vi.fn();

    await register(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects when the email is already registered', async () => {
    findOne.mockResolvedValue({ id: 1, email: 'a@b.com' });
    const req = { body: { name: 'Kelvis', email: 'a@b.com', password: 'pw12345' } };
    const res = mockRes();
    const next = vi.fn();

    await register(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(create).not.toHaveBeenCalled();
  });

  it('coerces any non-"owner" role to "client"', async () => {
    findOne.mockResolvedValue(null);
    hash.mockResolvedValue('hashed-pw');
    create.mockResolvedValue({ id: 1, name: 'Kelvis', email: 'a@b.com', role: 'client' });

    const req = { body: { name: 'Kelvis', email: 'a@b.com', password: 'pw12345', role: 'admin' } };
    const res = mockRes();
    const next = vi.fn();

    await register(req, res, next);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ role: 'client' }));
  });

  it('creates an owner when role is explicitly "owner"', async () => {
    findOne.mockResolvedValue(null);
    hash.mockResolvedValue('hashed-pw');
    create.mockResolvedValue({ id: 1, name: 'K', email: 'a@b.com', role: 'owner' });

    const req = { body: { name: 'K', email: 'a@b.com', password: 'pw12345', role: 'owner' } };
    const res = mockRes();
    const next = vi.fn();

    await register(req, res, next);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ role: 'owner' }));
  });

  it('never returns the password hash to the client', async () => {
    findOne.mockResolvedValue(null);
    hash.mockResolvedValue('super-secret-hash');
    create.mockResolvedValue({
      id: 1, name: 'Kelvis', email: 'a@b.com', role: 'client', passwordHash: 'super-secret-hash',
    });

    const req = { body: { name: 'Kelvis', email: 'a@b.com', password: 'pw12345' } };
    const res = mockRes();
    const next = vi.fn();

    await register(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload.user.passwordHash).toBeUndefined();
    expect(payload.token).toBe('signed.jwt.token');
  });

  it('forwards unexpected errors to next()', async () => {
    findOne.mockRejectedValue(new Error('db down'));
    const req = { body: { name: 'K', email: 'a@b.com', password: 'pw12345' } };
    const res = mockRes();
    const next = vi.fn();

    await register(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('login', () => {
  it('rejects with a generic message when the email does not exist', async () => {
    findOne.mockResolvedValue(null);
    const req = { body: { email: 'nope@b.com', password: 'x' } };
    const res = mockRes();
    const next = vi.fn();

    await login(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Credenciales inválidas' });
  });

  it('rejects with the same generic message on a wrong password (does not leak which field was wrong)', async () => {
    findOne.mockResolvedValue({ id: 1, email: 'a@b.com', passwordHash: 'hashed' });
    compare.mockResolvedValue(false);
    const req = { body: { email: 'a@b.com', password: 'wrong' } };
    const res = mockRes();
    const next = vi.fn();

    await login(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Credenciales inválidas' });
  });

  it('returns a token and public user on success', async () => {
    const user = { id: 1, name: 'K', email: 'a@b.com', role: 'client', passwordHash: 'hashed' };
    findOne.mockResolvedValue(user);
    compare.mockResolvedValue(true);
    const req = { body: { email: 'a@b.com', password: 'right' } };
    const res = mockRes();
    const next = vi.fn();

    await login(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      token: 'signed.jwt.token',
      user: { id: 1, name: 'K', email: 'a@b.com', role: 'client' },
    });
  });

  it('forwards unexpected errors to next()', async () => {
    findOne.mockRejectedValue(new Error('db down'));
    const req = { body: { email: 'a@b.com', password: 'x' } };
    const res = mockRes();
    const next = vi.fn();

    await login(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('me', () => {
  it('returns the public shape of req.user without the password hash', async () => {
    const req = { user: { id: 1, name: 'K', email: 'a@b.com', role: 'client', passwordHash: 'hashed' } };
    const res = mockRes();

    await me(req, res);

    expect(res.json).toHaveBeenCalledWith({
      user: { id: 1, name: 'K', email: 'a@b.com', role: 'client' },
    });
  });
});
