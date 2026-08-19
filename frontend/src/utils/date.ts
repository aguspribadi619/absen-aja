const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const DAYS_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function formatIndonesianDate(date: Date): string {
  return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

// Backend timestamps are UTC ISO strings; attendance day/time is always
// shown in WIB (UTC+7) — see backend/server.py wib_today_bounds_utc.
// Shifting the Date by 7h and reading its UTC getters back out avoids
// depending on the device's own timezone/locale support.
function toWibParts(iso: string) {
  const d = new Date(new Date(iso).getTime() + 7 * 60 * 60 * 1000);
  return {
    day: d.getUTCDay(),
    date: d.getUTCDate(),
    month: d.getUTCMonth(),
    year: d.getUTCFullYear(),
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
    seconds: d.getUTCSeconds(),
  };
}

export function formatWibShortDate(iso: string): string {
  const p = toWibParts(iso);
  return `${DAYS[p.day]}, ${pad2(p.date)}/${pad2(p.month + 1)}/${p.year}`;
}

export function formatWibTime(iso: string): string {
  const p = toWibParts(iso);
  return `${pad2(p.hours)}:${pad2(p.minutes)}:${pad2(p.seconds)}`;
}

export function formatWibHM(iso: string): string {
  const p = toWibParts(iso);
  return `${pad2(p.hours)}:${pad2(p.minutes)}`;
}

export function formatWibDayBox(iso: string): { day: string; abbr: string } {
  const p = toWibParts(iso);
  return { day: String(p.date), abbr: DAYS_SHORT[p.day] };
}

export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount).toString();
  const withSeparators = rounded.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `Rp${withSeparators}`;
}
