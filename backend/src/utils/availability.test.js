import { describe, it, expect } from 'vitest';
import { rangesOverlap, buildDaySlots } from './availability.js';

describe('rangesOverlap', () => {
  it('detecta solapamiento total', () => {
    expect(rangesOverlap('10:00', '11:00', '10:00', '11:00')).toBe(true);
  });

  it('detecta solapamiento parcial', () => {
    expect(rangesOverlap('10:00', '11:00', '10:30', '11:30')).toBe(true);
  });

  it('detecta un rango contenido dentro de otro', () => {
    expect(rangesOverlap('09:00', '12:00', '10:00', '11:00')).toBe(true);
  });

  it('NO considera solapados dos rangos consecutivos (fin = inicio)', () => {
    expect(rangesOverlap('10:00', '11:00', '11:00', '12:00')).toBe(false);
  });

  it('NO considera solapados rangos completamente separados', () => {
    expect(rangesOverlap('08:00', '09:00', '14:00', '15:00')).toBe(false);
  });

  it('funciona sin importar el orden de los argumentos', () => {
    expect(rangesOverlap('14:00', '15:00', '08:00', '09:00')).toBe(false);
    expect(rangesOverlap('10:30', '11:30', '10:00', '11:00')).toBe(true);
  });
});

describe('buildDaySlots', () => {
  const schedule = { openTime: '08:00', closeTime: '11:00' };

  it('devuelve arreglo vacío si no hay horario configurado ese día', () => {
    expect(buildDaySlots(null, [])).toEqual([]);
    expect(buildDaySlots(undefined, [])).toEqual([]);
  });

  it('genera slots de 1 hora cubriendo todo el horario, todos disponibles sin reservas', () => {
    const slots = buildDaySlots(schedule, []);
    expect(slots).toEqual([
      { startTime: '08:00', endTime: '09:00', available: true },
      { startTime: '09:00', endTime: '10:00', available: true },
      { startTime: '10:00', endTime: '11:00', available: true },
    ]);
  });

  it('marca como ocupado el slot que se solapa con una reserva activa', () => {
    const slots = buildDaySlots(schedule, [{ startTime: '09:00', endTime: '10:00', status: 'confirmed' }]);
    expect(slots.find((s) => s.startTime === '09:00').available).toBe(false);
    expect(slots.find((s) => s.startTime === '08:00').available).toBe(true);
    expect(slots.find((s) => s.startTime === '10:00').available).toBe(true);
  });

  it('ignora reservas canceladas al calcular disponibilidad', () => {
    const slots = buildDaySlots(schedule, [{ startTime: '09:00', endTime: '10:00', status: 'cancelled' }]);
    expect(slots.every((s) => s.available)).toBe(true);
  });

  it('marca ocupado un slot con una reserva pendiente (no solo confirmada)', () => {
    const slots = buildDaySlots(schedule, [{ startTime: '08:00', endTime: '09:00', status: 'pending' }]);
    expect(slots.find((s) => s.startTime === '08:00').available).toBe(false);
  });

  it('no genera un slot parcial cuando el horario no cubre una hora completa', () => {
    const oddSchedule = { openTime: '08:00', closeTime: '10:30' };
    const slots = buildDaySlots(oddSchedule, []);
    expect(slots.map((s) => s.startTime)).toEqual(['08:00', '09:00']);
  });
});
