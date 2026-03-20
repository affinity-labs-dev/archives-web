/** Escape HTML entities to prevent XSS when inserting text into innerHTML */
export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
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
