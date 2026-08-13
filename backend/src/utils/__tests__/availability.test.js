import { describe, it, expect } from 'vitest';
import { rangesOverlap, buildDaySlots } from '../availability.js';

describe('rangesOverlap', () => {
  it('returns true when ranges partially overlap', () => {
    expect(rangesOverlap('09:00', '10:00', '09:30', '10:30')).toBe(true);
  });

  it('returns true when one range fully contains the other', () => {
    expect(rangesOverlap('09:00', '12:00', '10:00', '11:00')).toBe(true);
  });

  it('returns true when ranges are identical', () => {
    expect(rangesOverlap('09:00', '10:00', '09:00', '10:00')).toBe(true);
  });

  it('returns false when ranges do not touch at all', () => {
    expect(rangesOverlap('08:00', '09:00', '10:00', '11:00')).toBe(false);
  });

  it('returns false when ranges only touch edge-to-edge (back-to-back)', () => {
    expect(rangesOverlap('09:00', '10:00', '10:00', '11:00')).toBe(false);
    expect(rangesOverlap('10:00', '11:00', '09:00', '10:00')).toBe(false);
  });

  it('is symmetric regardless of argument order', () => {
    expect(rangesOverlap('09:00', '10:00', '09:30', '10:30')).toBe(
      rangesOverlap('09:30', '10:30', '09:00', '10:00')
    );
  });
});

describe('buildDaySlots', () => {
  it('returns an empty array when there is no schedule for that day', () => {
    expect(buildDaySlots(null, [])).toEqual([]);
    expect(buildDaySlots(undefined, [])).toEqual([]);
  });

  it('returns an empty array when open and close times are equal', () => {
    const schedule = { openTime: '09:00', closeTime: '09:00' };
    expect(buildDaySlots(schedule, [])).toEqual([]);
  });

  it('does not include a trailing partial slot shorter than a full hour', () => {
    const schedule = { openTime: '09:00', closeTime: '10:30' };
    const slots = buildDaySlots(schedule, []);
    expect(slots).toEqual([{ startTime: '09:00', endTime: '10:00', available: true }]);
  });

  it('marks every slot available when there are no reservations', () => {
    const schedule = { openTime: '09:00', closeTime: '12:00' };
    const slots = buildDaySlots(schedule, []);
    expect(slots).toHaveLength(3);
    expect(slots.every((s) => s.available)).toBe(true);
  });

  it('marks a slot unavailable when an active reservation overlaps it', () => {
    const schedule = { openTime: '09:00', closeTime: '12:00' };
    const reservations = [{ status: 'confirmed', startTime: '10:00', endTime: '11:00' }];
    const slots = buildDaySlots(schedule, reservations);
    expect(slots.find((s) => s.startTime === '10:00').available).toBe(false);
    expect(slots.find((s) => s.startTime === '09:00').available).toBe(true);
    expect(slots.find((s) => s.startTime === '11:00').available).toBe(true);
  });

  it('treats pending reservations as blocking, same as confirmed', () => {
    const schedule = { openTime: '09:00', closeTime: '10:00' };
    const reservations = [{ status: 'pending', startTime: '09:00', endTime: '10:00' }];
    const slots = buildDaySlots(schedule, reservations);
    expect(slots[0].available).toBe(false);
  });

  it('ignores cancelled reservations when computing availability', () => {
    const schedule = { openTime: '09:00', closeTime: '10:00' };
    const reservations = [{ status: 'cancelled', startTime: '09:00', endTime: '10:00' }];
    const slots = buildDaySlots(schedule, reservations);
    expect(slots[0].available).toBe(true);
  });

  it('handles a reservation that spans multiple slots', () => {
    const schedule = { openTime: '09:00', closeTime: '13:00' };
    const reservations = [{ status: 'confirmed', startTime: '09:30', endTime: '11:30' }];
    const slots = buildDaySlots(schedule, reservations);
    expect(slots.map((s) => s.available)).toEqual([false, false, false, true]);
  });
});
