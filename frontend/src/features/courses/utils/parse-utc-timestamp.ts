import { formatDistanceToNow, parseISO } from "date-fns";

/** Backend stores UTC datetimes without a timezone suffix. */
export function parseUtcTimestamp(value: string): Date {
  if (/[zZ]$/.test(value) || /[+-]\d{2}:\d{2}$/.test(value)) {
    return parseISO(value);
  }
  return parseISO(`${value}Z`);
}

export function formatUtcDistanceToNow(value: string): string {
  return formatDistanceToNow(parseUtcTimestamp(value), { addSuffix: true });
}
