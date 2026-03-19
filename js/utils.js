/** Escape HTML entities to prevent XSS when inserting text into innerHTML */
export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/** Validate that a URL is safe for use in src/style attributes */
export function sanitizeUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('/') || trimmed.startsWith('assets/')) {
    return trimmed;
  }
  return '';
}
