import { describe, it, expect } from 'vitest';
import { safeNext } from './safeNext';

describe('safeNext', () => {
  it('acepta rutas internas', () => {
    expect(safeNext('/canchas/3')).toBe('/canchas/3');
    expect(safeNext('/mis-reservas?x=1')).toBe('/mis-reservas?x=1');
  });

  it('rechaza destinos externos o raros y usa el fallback', () => {
    for (const bad of ['//evil.com', 'https://evil.com', '/\\evil.com', 'canchas', '', null, undefined]) {
      expect(safeNext(bad)).toBe('/');
    }
  });
});
