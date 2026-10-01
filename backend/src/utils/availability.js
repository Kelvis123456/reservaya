const SLOT_MINUTES = 60;

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function toHHMM(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}

// Genera los slots de 1 hora de un día según el horario configurado,
// y marca cuáles ya están ocupados por reservas activas (pending/confirmed).
export function buildDaySlots(schedule, reservationsForDay) {
  if (!schedule) return [];

  const open = toMinutes(schedule.openTime);
  const close = toMinutes(schedule.closeTime);
  const slots = [];

  for (let start = open; start + SLOT_MINUTES <= close; start += SLOT_MINUTES) {
    const startTime = toHHMM(start);
    const endTime = toHHMM(start + SLOT_MINUTES);
    const isTaken = reservationsForDay.some((r) =>
      r.status !== 'cancelled' && rangesOverlap(startTime, endTime, r.startTime, r.endTime)
    );
    slots.push({ startTime, endTime, available: !isTaken });
  }

  return slots;
}

export const VENUE_TZ = 'America/Santo_Domingo';
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isValidTime = (t) => typeof t === 'string' && HHMM.test(t);

/** 'YYYY-MM-DD' que además existe en el calendario (2026-02-30 no). */
export function isValidDate(d) {
  if (typeof d !== 'string' || !ISO_DATE.test(d)) return false;
  const dt = new Date(`${d}T00:00:00Z`);
  return !Number.isNaN(dt.getTime()) && dt.toISOString().slice(0, 10) === d;
}

/** Día de la semana (0 = domingo) de una fecha 'YYYY-MM-DD', sin depender de la zona del servidor. */
export const dayOfWeekOf = (d) => new Date(`${d}T00:00:00Z`).getUTCDay();

/** Fecha y minuto actuales en la zona de las canchas, no la del servidor (Render corre en UTC). */
export function nowIn(tz = VENUE_TZ, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(now).map((p) => [p.type, p.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

/**
 * Valida una reserva contra el horario del día. Devuelve el mensaje de error o null.
 * Antes solo se pedía "HH:MM": pasaban horas al revés (precio negativo), reservas de
 * duración cero, fuera del horario, fuera de la grilla de 1h, días cerrados y fechas pasadas.
 */
export function bookingError({ date, startTime, endTime }, schedule, now = new Date()) {
  if (!isValidDate(date)) return 'La fecha no es válida (YYYY-MM-DD)';
  if (!isValidTime(startTime) || !isValidTime(endTime)) return 'Las horas deben tener formato HH:MM';
  const start = toMinutes(startTime), end = toMinutes(endTime);
  if (end <= start) return 'La hora de fin debe ser posterior a la de inicio';
  if (!schedule) return 'La cancha no abre ese día';
  const open = toMinutes(schedule.openTime), close = toMinutes(schedule.closeTime);
  if (start < open || end > close) return `Fuera del horario de la cancha (${schedule.openTime}–${schedule.closeTime})`;
  if ((start - open) % SLOT_MINUTES !== 0 || (end - start) % SLOT_MINUTES !== 0) return 'Las reservas son por bloques de 1 hora';
  const today = nowIn(VENUE_TZ, now);
  if (date < today.date || (date === today.date && start <= today.minutes)) return 'Ese horario ya pasó';
  return null;
}

export const hoursBetween = (startTime, endTime) => (toMinutes(endTime) - toMinutes(startTime)) / 60;
