import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { signToken, verifyToken } from '../jwt.js';

describe('signToken / verifyToken', () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalExpiry = process.env.JWT_EXPIRES_IN;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
    process.env.JWT_EXPIRES_IN = originalExpiry;
  });

  it('signs a token that round-trips the user id and role', () => {
    const token = signToken({ id: 42, role: 'owner' });
    const payload = verifyToken(token);
    expect(payload.id).toBe(42);
    expect(payload.role).toBe('owner');
  });

  it('does not leak other user fields (e.g. password hash) into the payload', () => {
    const token = signToken({ id: 1, role: 'client', passwordHash: 'secret-hash', email: 'a@b.com' });
    const payload = verifyToken(token);
    expect(payload.passwordHash).toBeUndefined();
    expect(payload.email).toBeUndefined();
  });

  it('defaults to a 7 day expiry when JWT_EXPIRES_IN is not set', () => {
    delete process.env.JWT_EXPIRES_IN;
    const token = signToken({ id: 1, role: 'client' });
    const payload = verifyToken(token);
    const lifetimeSeconds = payload.exp - payload.iat;
    expect(lifetimeSeconds).toBe(7 * 24 * 60 * 60);
  });

  it('throws on a malformed token', () => {
    expect(() => verifyToken('not-a-real-token')).toThrow();
  });

  it('throws on a token signed with a different secret', () => {
    const token = jwt.sign({ id: 1, role: 'client' }, 'a-different-secret');
    expect(() => verifyToken(token)).toThrow();
  });

  it('throws on an expired token', () => {
    const token = jwt.sign({ id: 1, role: 'client' }, process.env.JWT_SECRET, { expiresIn: -10 });
    expect(() => verifyToken(token)).toThrow(/expired/i);
  });

  it('throws on an empty string token', () => {
    expect(() => verifyToken('')).toThrow();
  });
});
