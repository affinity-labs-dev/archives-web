import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeHtml, sanitizeUrl } from '../utils.js';

describe('escapeHtml', () => {
  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).not.toContain('<script>');
    expect(escapeHtml('<b>bold</b>')).toBe('&lt;b&gt;bold&lt;/b&gt;');
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes quotes, because most call sites interpolate into attributes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('prevents breaking out of a quoted attribute', () => {
    const evil = '" onerror="alert(1)';
    const html = '<img alt="' + escapeHtml(evil) + '">';
    const el = document.createElement('div');
    el.innerHTML = html;
    expect(el.firstChild.getAttribute('onerror')).toBeNull();
    expect(el.firstChild.getAttribute('alt')).toBe(evil);
  });

  it('returns empty string for falsy input', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml('')).toBe('');
    expect(escapeHtml(0)).toBe('');
  });

  it('handles numbers by converting to string', () => {
    expect(escapeHtml(42)).toBe('42');
  });
});

describe('sanitizeHtml (fallback, no DOMPurify)', () => {
  it('returns empty string for falsy input', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml('')).toBe('');
  });

  it('strips script tags', () => {
    const input = '<p>Hello</p><script>alert(1)</script>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<script');
    expect(result).toContain('<p>Hello</p>');
  });

  it('strips inline event handlers', () => {
    const input = '<div onclick="alert(1)">click me</div>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onclick');
  });
});

describe('sanitizeUrl', () => {
  it('allows https URLs', () => {
    expect(sanitizeUrl('https://example.com/img.png')).toBe('https://example.com/img.png');
  });

  it('allows absolute paths', () => {
    expect(sanitizeUrl('/images/photo.jpg')).toBe('/images/photo.jpg');
  });

  it('allows relative assets/ paths', () => {
    expect(sanitizeUrl('assets/videos/v.mp4')).toBe('assets/videos/v.mp4');
  });

  it('blocks javascript: URLs', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
  });

  it('blocks data: URLs', () => {
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
  });

  it('blocks http: URLs', () => {
    expect(sanitizeUrl('http://example.com')).toBe('');
  });

  it('returns empty for falsy input', () => {
    expect(sanitizeUrl('')).toBe('');
    expect(sanitizeUrl(null)).toBe('');
    expect(sanitizeUrl(undefined)).toBe('');
  });

  it('trims whitespace', () => {
    expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
  });
});
