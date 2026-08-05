import { describe, it, expect } from 'vitest';
import { renderHeader } from '../header.js';

describe('renderHeader', () => {
  it('renders a header with logo', () => {
    const html = renderHeader('Test Title');
    expect(html).toContain('header__logo');
    expect(html).toContain('archives-logo-light.png');
  });

  it('renders back button when backHash is provided', () => {
    const html = renderHeader('Title', '/adventure/prophets_1');
    expect(html).toContain('header__back');
    expect(html).toContain('href="#/adventure/prophets_1"');
  });

  it('omits back button when backHash is null', () => {
    const html = renderHeader('Title', null);
    expect(html).not.toContain('header__back');
  });

  it('renders breadcrumbs when provided', () => {
    const crumbs = [
      { label: 'Home', hash: '/' },
      { label: 'Prophets', hash: '/era/prophets' },
      { label: 'Lesson 1' },
    ];
    const html = renderHeader('Title', null, crumbs);
    expect(html).toContain('bc__link');
    expect(html).toContain('Home');
    expect(html).toContain('Prophets');
    expect(html).toContain('bc__current');
    expect(html).toContain('Lesson 1');
  });

  it('marks last breadcrumb as current (not a link)', () => {
    const crumbs = [
      { label: 'Home', hash: '/' },
      { label: 'Current Page' },
    ];
    const html = renderHeader('Title', null, crumbs);
    expect(html).toContain('<span class="bc__current">Current Page</span>');
  });

  it('omits breadcrumbs when null', () => {
    const html = renderHeader('Title', null, null);
    expect(html).not.toContain('bc__link');
    expect(html).not.toContain('bc__current');
  });

  it('omits breadcrumbs when empty array', () => {
    const html = renderHeader('Title', null, []);
    expect(html).not.toContain('class="bc"');
  });

  it('escapes HTML in breadcrumb labels', () => {
    const crumbs = [{ label: '<script>alert(1)</script>' }];
    const html = renderHeader('Title', null, crumbs);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders breadcrumb separators between items', () => {
    const crumbs = [
      { label: 'A', hash: '/a' },
      { label: 'B', hash: '/b' },
      { label: 'C' },
    ];
    const html = renderHeader('Title', null, crumbs);
    expect(html).toContain('bc__sep');
  });
});
