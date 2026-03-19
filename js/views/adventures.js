import { getAdventures, getEra } from '../api.js';
import { getCompletedCount } from '../state.js';
import { renderHeader } from '../components/header.js';
import { escapeHtml, sanitizeUrl } from '../utils.js';

export default function adventuresView(app, params) {
  var eraId = params.eraId || 'prophets';
  app.innerHTML = '<div class="loading"><div class="spinner"></div>Loading</div>';
  let aborted = false;

  Promise.all([getAdventures(eraId), getEra(eraId)])
    .then(([adventures, era]) => {
      if (aborted) return;
      const eraTitle = era?.title || eraId;

      const cards = adventures.map((adv, idx) => {
        const totalModules = (adv.card_content?.total_modules) || 5;
        const completed = getCompletedCount(adv.readable_id);
        const progress = completed > 0 ? `${completed}/${totalModules}` : '';
        const title = escapeHtml(adv.adventure_title?.replace(/\r?\n/g, ' '));
        const bgImage = sanitizeUrl(adv.card_content?.background_image || adv.icon_url);
        const iconUrl = sanitizeUrl(adv.icon_url);
        const num = String(idx + 1).padStart(2, '0');
        const rid = escapeHtml(adv.readable_id);

        return `
          <div class="adventure-card" data-rid="${rid}">
            <img class="adventure-card__bg" src="${bgImage}" alt="" loading="lazy" onerror="if(this.src!=='${iconUrl}')this.src='${iconUrl}'">
            <div class="adventure-card__overlay">
              <div class="adventure-card__number">${num}</div>
              <div class="adventure-card__title">${title}</div>
              <div class="adventure-card__desc">${escapeHtml(adv.adventure_description)}</div>
              <div class="adventure-card__meta">
                <span class="adventure-card__badge">${escapeHtml(adv.timeline)}</span>
                ${adv.card_content?.estimated_time ? `<span class="adventure-card__time">${escapeHtml(adv.card_content.estimated_time)}</span>` : ''}
                ${progress ? `<span class="adventure-card__progress">${progress}</span>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');

      app.innerHTML = renderHeader(escapeHtml(eraTitle), '/', [
            { label: 'Home', hash: '/' },
            { label: escapeHtml(eraTitle) }
          ]) + `
        <div class="adventures fade-in">
          <div class="adventures__hero">
            ${era?.timeline ? `<div class="adventures__era-badge">${escapeHtml(era.timeline)}</div>` : ''}
            <h1 class="adventures__title">${escapeHtml(eraTitle)}</h1>
            <p class="adventures__desc">${escapeHtml(era?.description)}</p>
          </div>
          <div class="adventures__grid stagger-in">
            ${cards}
          </div>
        </div>
      `;

      // Attach click handlers via event delegation
      app.querySelectorAll('.adventure-card[data-rid]').forEach(card => {
        card.addEventListener('click', () => {
          window.location.hash = '/adventure/' + card.dataset.rid;
        });
      });
    })
    .catch(err => {
      if (aborted) return;
      app.innerHTML = '<div class="error-msg">Failed to load adventures.</div>';
    });

  return () => { aborted = true; };
}
