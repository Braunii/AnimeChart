/* Detail dialog content and open/close behaviour. */

import { DOW, DOW_LONG, SEASON_LABEL } from './config.js';
import { formatDate, formatTime, weekdayIndex } from './datetime.js';
import { episodesLabel, formatLabel, partialDate, statusLabel } from './labels.js';
import { nextForMedia } from './schedule.js';
import { activeTz, el, state, zoneLabel } from './state.js';
import { altTitle, displayTitle, initialFor } from './titles.js';
import { assetUrl, clamp, esc, escAttr, safeColor } from './utils.js';

function factMarkup(label, value, className = '') {
  return `<div class="d-fact"><dt>${esc(label)}</dt><dd class="${className}">${value}</dd></div>`;
}

function broadcastSummary(media) {
  const tz = activeTz();
  const next = nextForMedia(media);

  if (next) {
    return `Next: ${DOW_LONG[weekdayIndex(next.at, tz)]}, ${formatDate(next.at, tz)} · ${formatTime(next.at, tz)} ${zoneLabel()}`;
  }
  if (media.schedule.length) {
    const last = media.schedule[media.schedule.length - 1];
    return `Aired: ${DOW_LONG[weekdayIndex(last[0] * 1000, tz)]}, ${formatDate(last[0] * 1000, tz)} · ${formatTime(last[0] * 1000, tz)} ${zoneLabel()}`;
  }
  if (media.format === 'MOVIE' && media.startDate) {
    return `Released ${partialDate(media.startDate)}`;
  }
  return 'Broadcast time unavailable.';
}

function seasonRunMarkup(media) {
  const total = media.episodes;
  if (!total || total < 2 || media.format === 'MOVIE') return '';

  const upcoming = nextForMedia(media);
  let current;
  if (media.status === 'NOT_YET_RELEASED') current = 0;
  else if (media.status === 'FINISHED') current = total;
  else if (upcoming) current = clamp(upcoming.ep - 1, 0, total);
  else current = 0;

  const percent = clamp((current / total) * 100, 0, 100);
  const remaining = Math.max(0, total - current);
  const note = media.status === 'FINISHED'
    ? 'Season complete.'
    : remaining > 0
      ? `${remaining} episode${remaining === 1 ? '' : 's'} remaining.`
      : 'Final episode has aired.';

  return `<section class="d-section">
    <p class="d-label">Season run</p>
    <div class="d-run">
      <div class="d-run-head">
        <span>${current} of ${total} episodes</span>
        <span>${Math.round(percent)}%</span>
      </div>
      <div class="d-run-track"><span style="width:${percent.toFixed(1)}%"></span></div>
      <p class="d-run-note">${esc(note)}</p>
    </div>
  </section>`;
}

function episodeListMarkup(media) {
  if (!media.schedule.length) {
    return '<p class="d-empty-note">No episode air dates are listed for this title yet.</p>';
  }

  const tz = activeTz();
  const now = Date.now();
  const upcoming = nextForMedia(media);
  const nextEpisode = upcoming ? upcoming.ep : null;

  return media.schedule.map(([at, episode]) => {
    const ms = at * 1000;
    const isPast = ms < now;
    const isNext = nextEpisode != null && episode === nextEpisode && !isPast;
    return `<div class="d-episode ${isPast ? 'is-past' : ''} ${isNext ? 'is-next' : ''}">
      <span class="ep-num">EP ${episode != null ? episode : '—'}</span>
      <span>${esc(DOW[weekdayIndex(ms, tz)])} ${esc(formatDate(ms, tz))}</span>
      <span class="ep-date">${esc(formatTime(ms, tz))}</span>
    </div>`;
  }).join('');
}

export function openDetail(id) {
  if (!state.data) return;
  const media = state.mediaById.get(id);
  if (!media) return;

  const title = displayTitle(media);
  const alternative = altTitle(media);
  const starred = state.watchlist.has(media.id);
  const banner = assetUrl(media.banner) || assetUrl(media.cover);
  const poster = assetUrl(media.coverSmall) || assetUrl(media.cover);
  const description = media.description || 'No synopsis is available for this title yet.';
  const genres = media.genres.map((genre) => `<span class="d-tag">${esc(genre)}</span>`).join('');
  const studios = media.studios.length ? media.studios.join(', ') : '—';
  const score = media.score
    ? `<span class="d-score">${media.score}%</span>`
    : '<span class="d-empty-note">Unrated</span>';
  const premiered = media.startDate ? partialDate(media.startDate) : 'TBA';
  const aired = media.startDate
    ? `${partialDate(media.startDate)}${media.endDate ? ` – ${partialDate(media.endDate)}` : ''}`
    : 'TBA';

  const facts = [
    factMarkup('Score', score),
    factMarkup('Format', esc(formatLabel(media.format))),
    factMarkup('Episodes', esc(episodesLabel(media))),
    factMarkup('Studio', esc(studios)),
    factMarkup('Status', esc(statusLabel(media.status))),
    factMarkup('Premiered', esc(premiered)),
    factMarkup('Aired', esc(aired))
  ].join('');

  const site = media.siteUrl
    ? `<a class="btn" href="${escAttr(media.siteUrl)}" target="_blank" rel="noopener noreferrer">AniList <svg aria-hidden="true"><use href="#i-external"></use></svg></a>`
    : '';

  el.detailContent.innerHTML = `
    <div class="d-banner ${banner ? '' : 'no-banner'}" style="--tint:${safeColor(media.color)};${banner ? `background-image:url('${escAttr(banner)}')` : ''}"></div>
    <div class="d-head">
      <div class="d-poster-wrap" style="--tint:${safeColor(media.color)}">
        <span class="d-poster-letter" aria-hidden="true">${esc(initialFor(media))}</span>
        ${poster ? `<img class="d-poster" src="${escAttr(poster)}" alt="" onerror="this.remove()">` : ''}
      </div>
      <div class="d-info">
        <p class="d-eyebrow">
          <span>${esc(formatLabel(media.format))}</span><span class="dot"></span>
          <span>${esc(statusLabel(media.status))}</span><span class="dot"></span>
          <span>${esc(media.season ? `${SEASON_LABEL[media.season] || 'Season'} ${media.seasonYear || ''}` : 'Continuing')}</span>
        </p>
        <h2 id="detail-title">${esc(title)}</h2>
        ${alternative ? `<p class="d-alt">${esc(alternative)}</p>` : ''}
        ${genres ? `<div class="d-tags">${genres}</div>` : ''}
        <div class="d-actions">
          <button type="button" class="btn btn-accent" data-star="${media.id}" data-watch-label="1" aria-pressed="${starred}">
            <svg aria-hidden="true"><use href="#i-star"></use></svg>
            <span data-label>${starred ? 'In watchlist' : 'Add to watchlist'}</span>
          </button>
          ${site}
        </div>
      </div>
    </div>
    <div class="d-body">
      <div class="d-main">
        <section class="d-section">
          <p class="d-label">Synopsis</p>
          <div class="d-synopsis"><p>${esc(description)}</p></div>
        </section>
        <section class="d-section">
          <p class="d-label">Broadcast</p>
          <div class="d-broadcast">
            <svg aria-hidden="true"><use href="#i-calendar"></use></svg>
            <span>${esc(broadcastSummary(media))}</span>
          </div>
        </section>
        ${seasonRunMarkup(media)}
      </div>
      <aside class="d-side">
        <section class="d-section">
          <p class="d-label">Details</p>
          <dl class="d-facts">${facts}</dl>
        </section>
      </aside>
      <section class="d-episodes-section">
        <p class="d-label">Episode schedule</p>
        <div class="d-episodes">${episodeListMarkup(media)}</div>
      </section>
    </div>`;

  state.openMediaId = media.id;

  if (!el.detail.open) {
    if (typeof el.detail.showModal === 'function') el.detail.showModal();
    else el.detail.setAttribute('open', '');
  }
  document.body.classList.add('has-dialog');
  el.detailClose.focus({ preventScroll: true });
}

export function closeDetail() {
  if (el.detail.open && typeof el.detail.close === 'function') el.detail.close();
  else el.detail.removeAttribute('open');
  document.body.classList.remove('has-dialog');
}
