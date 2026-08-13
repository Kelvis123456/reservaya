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
