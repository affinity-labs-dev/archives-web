/**
 * Format a Date as "YYYY-MM-DD" in the **local** timezone.
 *
 * Using toISOString() returns UTC which can drift +/-1 day for non-UTC timezones.
 * This helper ensures date strings match Supabase `date` column values and
 * AsyncStorage date keys regardless of the user's timezone.
 */
export function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
