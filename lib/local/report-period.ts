export type Frequency = "WEEKLY" | "MONTHLY";
export const REPORT_TIMEZONE = "America/Santiago";
type Day = { year: number; month: number; day: number };
function dayAt(date: Date): Day {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIMEZONE, year:"numeric", month:"2-digit", day:"2-digit"
  }).formatToParts(date);
  const n = (type: string) => Number(parts.find(p => p.type === type)!.value);
  return { year: n("year"), month:n("month"), day:n("day") };
}
// Santiago changes offset at midnight. Binary search finds the first instant of
// the requested calendar date even when 00:00 does not exist during DST.
export function startOfDay(day: Day): Date {
  const target = day.year * 10000 + day.month * 100 + day.day;
  let lo = Date.UTC(day.year,day.month-1,day.day)-86400000;
  let hi = lo + 3*86400000;
  while (hi-lo > 1) {
    const mid = Math.floor((lo+hi)/2), d = dayAt(new Date(mid));
    if (d.year*10000+d.month*100+d.day >= target) hi=mid; else lo=mid;
  }
  return new Date(hi);
}
function shift(day: Day, days: number, months=0): Day {
  const d = new Date(Date.UTC(day.year,day.month-1+months,day.day+days));
  return { year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate() };
}
export function periodStart(now: Date, frequency: Frequency) {
  const day=dayAt(now);
  if (frequency==="MONTHLY") return startOfDay({...day,day:1});
  const weekday = new Date(Date.UTC(day.year,day.month-1,day.day)).getUTCDay();
  return startOfDay(shift(day,-((weekday+6)%7)));
}
export function nextPeriod(start: Date, frequency: Frequency) {
  return startOfDay(shift(dayAt(start),frequency==="WEEKLY"?7:0,frequency==="MONTHLY"?1:0));
}
export function previousPeriod(start: Date, frequency: Frequency) {
  return startOfDay(shift(dayAt(start),frequency==="WEEKLY"?-7:0,frequency==="MONTHLY"?-1:0));
}
export function reportDueAt(end: Date) {
  // Send from 08:00 Chilean time on the first day after the closed period.
  const candidate=new Date(startOfDay(dayAt(end)).getTime()+8*60*60*1000);
  const hour=Number(new Intl.DateTimeFormat("en-GB",{timeZone:REPORT_TIMEZONE,hour:"2-digit",hourCycle:"h23"}).format(candidate));
  return new Date(candidate.getTime()+(8-hour)*60*60*1000);
}
export function periodLabel(start: string | Date, end: string | Date) {
  const fmt=new Intl.DateTimeFormat("es-CL",{timeZone:REPORT_TIMEZONE,day:"numeric",month:"short",year:"numeric"});
  return fmt.format(new Date(start))+" — "+fmt.format(new Date(new Date(end).getTime()-1));
}
