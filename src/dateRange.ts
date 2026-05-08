export type DateRange = {
  since: Date;
  until: Date;
  label: string;
  reportDate: string;
};

export function formatDateInTimezone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function resolveDateRange(input: string, timezone: string, now = new Date()): DateRange {
  if (input === "yesterday") {
    const until = now;
    const since = new Date(until.getTime() - 24 * 60 * 60 * 1000);
    return {
      since,
      until,
      label: "past 24 hours, requested as yesterday",
      reportDate: formatDateInTimezone(since, timezone)
    };
  }

  const hoursMatch = input.match(/^(\d+)h$/i);
  if (hoursMatch) {
    const hours = Number(hoursMatch[1]);
    const until = now;
    const since = new Date(until.getTime() - hours * 60 * 60 * 1000);
    return {
      since,
      until,
      label: `past ${hours} hours`,
      reportDate: formatDateInTimezone(until, timezone)
    };
  }

  const since = new Date(input);
  if (Number.isNaN(since.getTime())) {
    throw new Error(`Unsupported --since value: ${input}. Use "24h", "yesterday", or an ISO date.`);
  }

  return {
    since,
    until: now,
    label: `since ${since.toISOString()}`,
    reportDate: formatDateInTimezone(now, timezone)
  };
}

export function resolveCalendarDateRange(dateInput: string, timezone: string): DateRange {
  const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Unsupported --date value: ${dateInput}. Use YYYY-MM-DD.`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const since = zonedTimeToUtc(year, month, day, 0, 0, 0, timezone);
  const untilDate = new Date(Date.UTC(year, month - 1, day + 1));
  const untilYear = untilDate.getUTCFullYear();
  const untilMonth = untilDate.getUTCMonth() + 1;
  const untilDay = untilDate.getUTCDate();
  const until = zonedTimeToUtc(untilYear, untilMonth, untilDay, 0, 0, 0, timezone);

  return {
    since,
    until,
    label: `${dateInput} full day (${timezone})`,
    reportDate: dateInput
  };
}

export function toIso(date: Date): string {
  return date.toISOString();
}

function zonedTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, second: number, timezone: string): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offset = getTimezoneOffsetMs(utcGuess, timezone);
  let utc = new Date(utcGuess.getTime() - offset);
  const nextOffset = getTimezoneOffsetMs(utc, timezone);
  if (nextOffset !== offset) {
    utc = new Date(utcGuess.getTime() - nextOffset);
  }
  return utc;
}

function getTimezoneOffsetMs(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - date.getTime();
}
