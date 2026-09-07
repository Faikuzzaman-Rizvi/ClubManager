/*
 * Match dates cross the wire without a timezone offset ("2026-08-19T15:00:00"),
 * because the API stores SQL `datetime` and serialises it with Kind=Unspecified.
 * JS parses that form as local time, so the wall-clock value survives a round
 * trip only as long as nothing here converts through UTC - which rules out
 * toISOString() for building request payloads.
 */

/** API date string -> the `YYYY-MM-DDTHH:mm` a datetime-local input expects. */
export function toDateTimeLocalValue(apiDate) {
  return apiDate ? apiDate.slice(0, 16) : '';
}

/** datetime-local value -> the payload string, unchanged so no offset creeps in. */
export function fromDateTimeLocalValue(value) {
  return value ? `${value}:00`.slice(0, 19) : null;
}

export function formatMatchDate(apiDate) {
  const date = new Date(apiDate);

  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatMatchDay(apiDate) {
  const date = new Date(apiDate);

  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}
