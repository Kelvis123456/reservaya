import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { notFoundHandler, errorHandler } from '../errorHandler.js';

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('notFoundHandler', () => {
  it('responds with 404 and a Spanish message', () => {
    const res = mockRes();
    notFoundHandler({}, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Ruta no encontrada' });
  });
});

describe('errorHandler', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('uses the error status and message when provided', () => {
    const res = mockRes();
    const err = Object.assign(new Error('Cancha no encontrada'), { status: 404 });
    errorHandler(err, {}, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Cancha no encontrada' });
  });

  it('falls back to 500 and a generic message when the error has neither', () => {
    const res = mockRes();
    const err = new Error();
    err.message = '';
    errorHandler(err, {}, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
  });

  it('logs the error for observability', () => {
    const res = mockRes();
    const err = new Error('boom');
    errorHandler(err, {}, res, vi.fn());
    expect(consoleSpy).toHaveBeenCalledWith(err);
  });
});
