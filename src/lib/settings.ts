export type ServiceWindow = { name: string; start: string; end: string };

export const SERVICE_WINDOWS: ServiceWindow[] = [
  { name: "Mittag", start: "11:30", end: "14:00" },
  { name: "Abend",  start: "17:00", end: "22:30" },
];

export const SLOT_MINUTES = 15;
export const DEFAULT_DURATION = 120;
export const BUFFER_MINUTES = 15;

export function timeOnDate(day: Date, hhmm: string): Date {
  const [hh, mm] = hhmm.split(":").map(Number);
  const d = new Date(day);
  d.setHours(hh, mm, 0, 0);
  return d;
}
export function generateSlotsForDay(day: Date, slotMinutes = SLOT_MINUTES): Date[] {
  const slots: Date[] = [];
  for (const w of SERVICE_WINDOWS) {
    const start = timeOnDate(day, w.start);
    const end = timeOnDate(day, w.end);
    for (let t = new Date(start); t <= end; t = new Date(t.getTime() + slotMinutes * 60_000)) slots.push(t);
  }
  return slots;
}
export function fitsServiceWindows(start: Date, durationMinutes: number, bufferMinutes: number): boolean {
  const end = new Date(start.getTime() + (durationMinutes + bufferMinutes) * 60_000);
  return SERVICE_WINDOWS.some(w => {
    const winStart = timeOnDate(start, w.start);
    const winEnd = timeOnDate(start, w.end);
    return start >= winStart && end <= winEnd;
  });
}
export function formatHHMM(d: Date): string {
  return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}
export function formatDateDE(d: Date): string {
  return d.toLocaleDateString("de-DE", { weekday: "short", year: "numeric", month: "2-digit", day: "2-digit" });
}
export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromDateInputValue(v: string): Date {
  const [y, m, d] = v.split("-").map(Number);
  // Mittags setzen, damit es nie an DST/Timezone-Kanten kippt
  return new Date(y, (m - 1), d, 12, 0, 0, 0);
}


