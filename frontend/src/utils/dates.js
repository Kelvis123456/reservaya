export const VENUE_TZ = 'America/Santo_Domingo';

/**
 * "Hoy" en Santo Domingo como YYYY-MM-DD. Antes se usaba toISOString() (UTC): desde las
 * 20:00 locales ya era "mañana" y no se podían elegir los horarios de esa misma noche.
 */
export function todayIn(tz = VENUE_TZ, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** "jueves, 1 de octubre" en vez del 2026-10-01 crudo. La fecha es de calendario, sin hora. */
export function formatDate(isoDate, opts = { weekday: 'long', day: 'numeric', month: 'long' }) {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString('es-DO', { ...opts, timeZone: 'UTC' });
}
