// Dates in the shop's time zone, Bangkok, whatever the visitor's own clock says. One formatter for the
// whole site, so the slip, the LINE message and anything later write a day the same way.

const TZ = 'Asia/Bangkok';
const DAY = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const DAY_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const MONTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export type Day = { key: string; weekday: number; date: number; month: number; offset: number };

// "now" in Bangkok as calendar parts and minutes past midnight
export function bangkokNow(at = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
      .formatToParts(at).map((x) => [x.type, Number(x.value)]),
  );
  return { y: p.year, m: p.month - 1, d: p.day, minutes: p.hour * 60 + p.minute };
}

export function nextDays(count: number, at = new Date()): Day[] {
  const { y, m, d } = bangkokNow(at);
  return Array.from({ length: count }, (_, offset) => {
    const t = new Date(Date.UTC(y, m, d + offset));
    return {
      key: t.toISOString().slice(0, 10),
      weekday: t.getUTCDay(),
      date: t.getUTCDate(),
      month: t.getUTCMonth(),
      offset,
    };
  });
}

export const dayShort = (day: Day) => DAY_SHORT[day.weekday];
export const dayLong = (day: Day) => `วัน${DAY[day.weekday]}ที่ ${day.date} ${MONTH[day.month]}`;
export const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
