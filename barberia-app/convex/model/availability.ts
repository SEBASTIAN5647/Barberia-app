// Pure helpers shared by convex/appointments.ts. No Convex imports here on
// purpose so this file stays trivially testable.

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function weekdayOf(dateISO: string): number {
  // dateISO = "2026-09-04" -> JS Date, using UTC to avoid TZ drift
  const d = new Date(dateISO + "T00:00:00Z");
  return d.getUTCDay(); // 0=domingo..6=sabado
}

export type BlockDoc = {
  recurrence: "none" | "weekly" | "daily";
  dateISO?: string;
  weekday?: number;
  startTime: string;
  endTime: string;
};

export function blockAppliesToDate(block: BlockDoc, dateISO: string): boolean {
  switch (block.recurrence) {
    case "none":
      return block.dateISO === dateISO;
    case "daily":
      return true;
    case "weekly":
      return block.weekday === weekdayOf(dateISO);
  }
}

export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Builds the list of free start times (as "HH:MM") for a given date and
 * service duration, given shop hours, existing (non-cancelled) appointments
 * for that date, and blocks that apply to that date.
 */
export function computeFreeSlots(opts: {
  dateISO: string;
  durationMin: number;
  openTime: string;
  closeTime: string;
  slotStepMin: number;
  existing: Array<{ time24: string; durationMin: number }>;
  blocks: BlockDoc[];
}): string[] {
  const { dateISO, durationMin, openTime, closeTime, slotStepMin, existing, blocks } = opts;
  const open = timeToMinutes(openTime);
  const close = timeToMinutes(closeTime);
  const applicableBlocks = blocks.filter((b) => blockAppliesToDate(b, dateISO));

  const busy = existing.map((a) => ({
    start: timeToMinutes(a.time24),
    end: timeToMinutes(a.time24) + a.durationMin,
  }));
  const blocked = applicableBlocks.map((b) => ({
    start: timeToMinutes(b.startTime),
    end: timeToMinutes(b.endTime),
  }));

  const slots: string[] = [];
  for (let start = open; start + durationMin <= close; start += slotStepMin) {
    const end = start + durationMin;
    const hitsBusy = busy.some((b) => rangesOverlap(start, end, b.start, b.end));
    const hitsBlock = blocked.some((b) => rangesOverlap(start, end, b.start, b.end));
    if (!hitsBusy && !hitsBlock) slots.push(minutesToTime(start));
  }
  return slots;
}
