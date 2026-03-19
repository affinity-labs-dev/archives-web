import { escapeHtml } from '../utils.js';

export function renderHeader(title, backHash = null, breadcrumbs = null) {
  const backBtn = backHash
    ? `<a class="header__back" href="#${escapeHtml(backHash)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </a>`
    : '';

  let bcHtml = '';
  if (breadcrumbs && breadcrumbs.length > 0) {
    const sep = '<svg class="bc__sep" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 6 15 12 9 18"/></svg>';
    bcHtml = '<nav class="bc">' + breadcrumbs.map(function(c, i) {
      if (i === breadcrumbs.length - 1) {
        return '<span class="bc__current">' + escapeHtml(c.label) + '</span>';
      }
      return '<a class="bc__link" href="#' + escapeHtml(c.hash) + '">' + escapeHtml(c.label) + '</a>' + sep;
    }).join('') + '</nav>';
  }

  return `
    <div class="header">
      ${backBtn}
      <a class="header__logo" href="#/">
        <img src="assets/images/archives-logo-light.png" alt="Archives" />
      </a>
      ${bcHtml}
    </div>
  `;
}
