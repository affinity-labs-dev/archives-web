/**
 * The calendar date in the user's own timezone, as YYYY-MM-DD.
 *
 * Use this for anything meaning "which day is it for this person": the daily
 * story, streaks, the week tracker, once-per-day flags. Date#toISOString
 * returns UTC, so west of Greenwich the day rolled over in the local afternoon
 * and streaks marked days missed that the user had actually completed.
 *
 * Timestamps (updated_at, checkedAt) stay ISO/UTC - this is only for calendar
 * days.
 */
export function localDateStr(date) {
  const d = date || new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Escape HTML entities before inserting text into innerHTML.
 *
 * Quotes are escaped too: most call sites interpolate into quoted attributes
 * (`data-era="' + escapeHtml(x) + '"`), and the older textContent/innerHTML
 * approach left " and ' intact, which lets a value break out of the attribute.
 */
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Sanitize CMS HTML — allows formatting tags, strips scripts/events */
export function sanitizeHtml(html) {
  if (!html) return '';
  if (window.DOMPurify) {
    return window.DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'span', 'div', 'blockquote', 'img', 'figure', 'figcaption', 'sup', 'sub'],
      ALLOWED_ATTR: ['href', 'class', 'src', 'alt', 'loading', 'target', 'rel'],
    });
  }
  // Fallback: strip script tags and event handlers
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
}

/** Validate that a URL is safe for use in src/style attributes */
export function sanitizeUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('/') || trimmed.startsWith('assets/')) {
    return trimmed;
  }
  return '';
}
