import { describe, it, expect } from 'vitest';
import { todayIn, formatDate } from './dates';

describe('todayIn', () => {
  it('a las 21:30 en Santo Domingo sigue siendo el mismo día aunque en UTC ya sea mañana', () => {
    expect(todayIn('America/Santo_Domingo', new Date('2026-10-02T01:30:00Z'))).toBe('2026-10-01');
  });

  it('a la medianoche local ya cambia de día', () => {
    expect(todayIn('America/Santo_Domingo', new Date('2026-10-02T04:00:00Z'))).toBe('2026-10-02');
  });
});

describe('formatDate', () => {
  it('formatea en español sin correrse de día por la zona del navegador', () => {
    expect(formatDate('2026-10-01')).toBe('jueves, 1 de octubre');
  });
});
