import { describe, it, expect } from 'vitest';
import { rangesOverlap, buildDaySlots, bookingError, isValidDate, dayOfWeekOf, nowIn } from './availability.js';

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

describe('nowIn', () => {
  it('usa la hora de Santo Domingo, no UTC (a las 21:00 locales UTC ya es mañana)', () => {
    // 2026-10-02T01:30Z = 2026-10-01 21:30 en America/Santo_Domingo (UTC-4)
    expect(nowIn('America/Santo_Domingo', new Date('2026-10-02T01:30:00Z'))).toEqual({ date: '2026-10-01', minutes: 21 * 60 + 30 });
  });
});

describe('isValidDate / dayOfWeekOf', () => {
  it('rechaza fechas que no existen o con otro formato', () => {
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('01/10/2026')).toBe(false);
    expect(isValidDate('2026-10-01')).toBe(true);
  });

  it('calcula el día de la semana sin depender de la zona del servidor', () => {
    expect(dayOfWeekOf('2026-10-04')).toBe(0); // domingo
    expect(dayOfWeekOf('2026-10-01')).toBe(4); // jueves
  });
});

describe('bookingError', () => {
  const schedule = { openTime: '08:00', closeTime: '22:00' };
  // "ahora" = 2026-10-01 10:30 en Santo Domingo
  const now = new Date('2026-10-01T14:30:00Z');
  const ok = { date: '2026-10-02', startTime: '18:00', endTime: '19:00' };

  it('acepta un bloque válido en el futuro', () => {
    expect(bookingError(ok, schedule, now)).toBeNull();
    expect(bookingError({ ...ok, startTime: '20:00', endTime: '22:00' }, schedule, now)).toBeNull();
  });

  it('rechaza horas al revés y de duración cero (antes daban precio negativo o gratis)', () => {
    expect(bookingError({ ...ok, startTime: '20:00', endTime: '18:00' }, schedule, now)).toMatch(/posterior/);
    expect(bookingError({ ...ok, startTime: '10:00', endTime: '10:00' }, schedule, now)).toMatch(/posterior/);
  });

  it('rechaza horas fuera de rango o mal formadas', () => {
    expect(bookingError({ ...ok, startTime: '99:99' }, schedule, now)).toMatch(/HH:MM/);
    expect(bookingError({ ...ok, endTime: '24:00' }, schedule, now)).toMatch(/HH:MM/);
  });

  it('rechaza reservar fuera del horario de la cancha', () => {
    expect(bookingError({ ...ok, startTime: '00:00', endTime: '23:00' }, schedule, now)).toMatch(/Fuera del horario/);
    expect(bookingError({ ...ok, startTime: '21:00', endTime: '23:00' }, schedule, now)).toMatch(/Fuera del horario/);
  });

  it('rechaza bloques que no calzan con la grilla de 1 hora', () => {
    expect(bookingError({ ...ok, startTime: '10:30', endTime: '11:30' }, schedule, now)).toMatch(/bloques/);
  });

  it('rechaza un día en que la cancha no abre', () => {
    expect(bookingError(ok, undefined, now)).toMatch(/no abre/);
  });

  it('rechaza fechas pasadas y horas de hoy que ya empezaron', () => {
    expect(bookingError({ ...ok, date: '2026-09-30' }, schedule, now)).toMatch(/pasó/);
    expect(bookingError({ ...ok, date: '2026-10-01', startTime: '10:00', endTime: '11:00' }, schedule, now)).toMatch(/pasó/);
    expect(bookingError({ ...ok, date: '2026-10-01', startTime: '11:00', endTime: '12:00' }, schedule, now)).toBeNull();
  });

  it('rechaza una fecha imposible en vez de dejar que Postgres responda 500', () => {
    expect(bookingError({ ...ok, date: '2026-02-30' }, schedule, now)).toMatch(/fecha/);
  });
});
