import { sanitizeUrl } from '../utils.js';

export function renderScrollableView(module) {
  const blocks = module.content_blocks || [];

  const html = blocks
    .sort((a, b) => a.order - b.order)
    .map(block => {
      if (block.type === 'text') {
        // text blocks contain intentional HTML from the CMS
        return `<div class="scrollable-view__block scrollable-view__block--text">${block.content}</div>`;
      }
      if (block.type === 'image') {
        const imgUrl = sanitizeUrl(block.url);
        return `<div class="scrollable-view__block scrollable-view__block--image">
          <img src="${imgUrl}" alt="" loading="lazy">
        </div>`;
      }
      return '';
    })
    .join('');

  return `<div class="scrollable-view fade-in">${html}</div>`;
}
