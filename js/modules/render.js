/* All DOM rendering: header, stats, weekly board, extras, countdown, footer. */

import {
  DOW,
  DOW_LONG,
  FORMAT_ORDER,
  MONTHS,
  SEASON_JP,
  SEASON_KICKER,
  SEASON_LABEL,
  SEASON_START_MONTH
} from './config.js';
import {
  airingState,
  dateKey,
  formatDate,
  formatTime,
  isoWeekNumber,
  timeAgo,
  tzParts,
  weekdayIndex,
  zonedToUtc
} from './datetime.js';
import { formatLabel, partialDate, statusLabel } from './labels.js';
import { computeDerived, filteredExtras, findNextAiring, passesFilters } from './schedule.js';
import { activeTz, el, state, zoneLabel } from './state.js';
import { displayTitle, initialFor } from './titles.js';
import { $$, assetUrl, clamp, esc, escAttr, pad2, safeColor } from './utils.js';

export function renderAll() {
  updateWatchCount();

  if (!state.data) {
    renderLoadingState();
    return;
  }

  state.derived = computeDerived();
  renderSeasonHeader();
  renderTabs();
  renderBoard();
  renderExtras();
  renderNext();
  renderFooter();
  updateClearButton();

  el.loading.hidden = true;
}

export function renderLoadingState() {
  el.loading.hidden = false;
  el.board.hidden = true;
  el.empty.hidden = true;
  el.extras.hidden = true;
  el.board.innerHTML = '';
  el.extrasGrid.innerHTML = '';
  el.dayTabs.innerHTML = '';
  el.resultCount.textContent = '';
  el.weekTitle.innerHTML = 'This week';
  el.countdown.className = 'countdown is-idle';
  el.countdown.textContent = '—';
  el.nextTitle.textContent = 'Charting the airwaves…';
  el.nextMeta.textContent = 'Loading this week’s schedule';
}

export function renderErrorState(message) {
  el.loading.hidden = true;
  el.board.hidden = true;
  el.extras.hidden = true;
  el.empty.hidden = false;
  el.emptyText.textContent = message;
  el.emptyReset.textContent = 'Try again';
  const heading = el.empty.querySelector('h3');
  if (heading) heading.textContent = 'The schedule is out of reach';
}

function renderSeasonHeader() {
  const data = state.data;
  const label = SEASON_LABEL[data.season] || 'Season';
  const year = data.seasonYear || '';
  const tz = activeTz();

  el.seasonKicker.innerHTML = `<span class="live-dot" aria-hidden="true"></span>${esc(SEASON_KICKER[data.season] || label)} ${year} · ${esc(SEASON_JP[data.season] || '')}`;
  el.seasonTitle.innerHTML = `<span class="season-word">${esc(label)}</span> <em class="season-year">${esc(year)}</em>`;
  document.title = `Anime Chart · ${label} ${year}`;

  const seasonal = data.media.filter((media) => !media.continuing);
  const seasonalAirings = state.derived.airings.filter((entry) => !entry.media.continuing);
  const uniqueShows = new Set(seasonalAirings.map((entry) => entry.id));

  el.statTitles.textContent = seasonal.length;
  el.statAiring.textContent = uniqueShows.size;
  el.statEpisodes.textContent = seasonalAirings.length;

  const startMonth = SEASON_START_MONTH[data.season] ?? 0;
  const start = zonedToUtc(data.seasonYear, startMonth, 1, 0, 0, tz);
  const end = zonedToUtc(data.seasonYear, startMonth + 3, 1, 0, 0, tz);
  const now = Date.now();
  const progress = clamp(((now - start) / (end - start)) * 100, 0, 100);
  const weekNumber = clamp(Math.floor((now - start) / (7 * 86400000)) + 1, 1, 13);
  const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));

  el.seasonMeterFill.style.width = `${progress.toFixed(1)}%`;
  el.seasonMeter.setAttribute('aria-valuenow', String(Math.round(progress)));
  el.seasonWeek.textContent = `Season week ${weekNumber} of 13`;
  el.seasonDays.textContent = daysLeft <= 1 ? 'Final day' : `${daysLeft} days left`;

  el.weekTitle.innerHTML = `${esc(weekTitleText(state.derived))} <span class="week-sub">Week ${isoWeekNumber(now, tz)}</span>`;
}

function weekTitleText(derived) {
  const { start, end } = derived.week;
  const first = tzParts(start, derived.tz);
  const last = tzParts(end - 1, derived.tz);

  if (first.month === last.month && first.year === last.year) {
    return `${MONTHS[first.month - 1]} ${first.day} – ${last.day}`;
  }
  if (first.year === last.year) {
    return `${MONTHS[first.month - 1]} ${first.day} – ${MONTHS[last.month - 1]} ${last.day}`;
  }
  return `${MONTHS[first.month - 1]} ${first.day}, ${first.year} – ${MONTHS[last.month - 1]} ${last.day}, ${last.year}`;
}

export function renderTabs() {
  if (!state.data || !state.derived) return;
  const { tz, week, today } = state.derived;
  const counts = new Array(7).fill(0);
  for (const entry of state.derived.airings) {
    if (passesFilters(entry.media)) counts[entry.day] += 1;
  }

  let html = `<button type="button" class="day-tab tab-all ${state.day === 'all' ? 'is-active' : ''}" data-day="all" aria-pressed="${state.day === 'all'}">All week</button>`;

  for (let index = 0; index < 7; index += 1) {
    const ms = week.start + index * 86400000 + 12 * 3600000;
    const parts = tzParts(ms, tz);
    const active = state.day === index;
    const label = `${DOW_LONG[index]}, ${MONTHS[parts.month - 1]} ${parts.day}`;
    html += `<button type="button" class="day-tab ${active ? 'is-active' : ''} ${index === today ? 'is-today' : ''}" data-day="${index}" aria-label="${esc(label)}${counts[index] ? `, ${counts[index]} airings` : ''}" aria-pressed="${active}">
      <span>${DOW[index]}</span><span class="tab-date">${parts.day}</span>
    </button>`;
  }

  el.dayTabs.innerHTML = html;
}

export function updateTabActive() {
  $$('.day-tab', el.dayTabs).forEach((button) => {
    const active = button.dataset.day === String(state.day);
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function dayColumn(dayIndex, entries, tz, today, limit = Infinity) {
  const ms = state.derived.week.start + dayIndex * 86400000 + 12 * 3600000;
  const parts = tzParts(ms, tz);
  const isToday = dayIndex === today;
  const now = Date.now();

  const visible = entries.slice(0, limit);
  const cards = visible.map((entry, index) => slotCard(entry, index, tz));

  if (isToday && entries.length) {
    const nowIndex = entries.findIndex((entry) => {
      const end = entry.at * 1000 + (entry.media.duration || 24) * 60000;
      return end > now;
    });
    const marker = `<div class="now-line" role="separator" aria-label="Current time ${esc(formatTime(now, tz))}"><span data-now>Now ${esc(formatTime(now, tz))}</span></div>`;
    if (nowIndex === -1 && visible.length === entries.length) cards.push(marker);
    else if (nowIndex >= 0 && nowIndex < cards.length) cards.splice(nowIndex, 0, marker);
  }

  const hidden = entries.length - visible.length;
  const more = hidden > 0
    ? `<button type="button" class="day-more" data-more="${dayIndex}">See all ${entries.length} <span aria-hidden="true">→</span></button>`
    : '';
  const cardsHtml = cards.length ? cards.join('') : '<p class="day-empty">No broadcasts</p>';

  return `<section class="day-col ${isToday ? 'is-today' : ''}" aria-label="${DOW_LONG[dayIndex]} ${MONTHS[parts.month - 1]} ${parts.day}">
    <header class="day-head">
      <span class="day-dow">${DOW[dayIndex]}</span>
      <span class="day-date">${parts.day}</span>
      <span class="day-count">${entries.length}</span>
    </header>
    <div class="slots">${cardsHtml}${more}</div>
  </section>`;
}

function slotCard(entry, index, tz) {
  const media = entry.media;
  const info = airingState(entry.at * 1000, media.duration);
  const starred = state.watchlist.has(media.id);
  const cover = assetUrl(media.coverSmall || media.cover);
  const title = displayTitle(media);
  const episode = entry.ep != null ? `EP ${entry.ep}` : 'EP —';
  const meta = `${episode} · ${formatLabel(media.format)}${media.continuing ? ' · cont.' : ''}`;
  const time = formatTime(entry.at * 1000, tz);

  return `<article class="slot ${info.cls}" style="--tint:${safeColor(media.color)};--i:${Math.min(index, 10)}">
    <button type="button" class="slot-hit" data-open="${media.id}" aria-label="View details for ${escAttr(title)}, ${escAttr(time)}"></button>
    <div class="slot-top">
      <time class="slot-time" datetime="${new Date(entry.at * 1000).toISOString()}">${time}</time>
      <span class="slot-state" data-at="${entry.at}" data-dur="${media.duration || 24}">${info.label}</span>
      <button type="button" class="star ${starred ? 'is-starred' : ''}" data-star="${media.id}" aria-label="${starred ? 'Remove' : 'Add'} ${escAttr(title)} ${starred ? 'from' : 'to'} watchlist" aria-pressed="${starred}">
        <svg aria-hidden="true"><use href="#i-star"></use></svg>
      </button>
    </div>
    <div class="slot-body">
      <div class="thumb" style="--tint:${safeColor(media.color)}">
        <span class="thumb-letter" aria-hidden="true">${esc(initialFor(media))}</span>
        ${cover ? `<img src="${escAttr(cover)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ''}
      </div>
      <div class="slot-info">
        <h3 class="slot-title">${esc(title)}</h3>
        <p class="slot-meta">${esc(meta)}</p>
      </div>
    </div>
  </article>`;
}

export function renderBoard() {
  if (!state.data || !state.derived) return;
  const derived = state.derived;
  const base = derived.airings.filter((entry) => passesFilters(entry.media));
  const selected = state.day === 'all'
    ? base
    : base.filter((entry) => entry.day === Number(state.day));

  el.resultCount.textContent = base.length
    ? `${base.length} ${base.length === 1 ? 'airing' : 'airings'}`
    : '';
  updateClearButton();

  if (!base.length) {
    el.board.hidden = true;
    el.board.innerHTML = '';
    el.empty.hidden = false;
    const extraCount = filteredExtras().length;

    if (state.watchlistOnly && state.watchlist.size === 0) {
      el.emptyText.textContent = 'Your watchlist is empty. Star a show to pin it here.';
    } else if (extraCount > 0) {
      el.emptyText.textContent = `No weekly broadcasts match${state.query ? ` “${state.query}”` : ''}. ${extraCount} matching ${extraCount === 1 ? 'title is' : 'titles are'} listed below under films & specials.`;
    } else if (state.query) {
      el.emptyText.textContent = `No broadcasts match “${state.query}”.`;
    } else {
      el.emptyText.textContent = 'No broadcasts match those filters.';
    }

    el.emptyReset.textContent = 'Reset filters';
    const heading = el.empty.querySelector('h3');
    if (heading) heading.textContent = extraCount > 0 ? 'Nothing airing weekly' : 'Nothing scheduled here';
    return;
  }

  el.empty.hidden = true;
  el.board.hidden = false;

  if (state.day === 'all') {
    el.board.dataset.view = 'week';
    let html = '';
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const entries = base
        .filter((entry) => entry.day === dayIndex)
        .sort((a, b) => a.at - b.at || displayTitle(a.media).localeCompare(displayTitle(b.media)));
      html += dayColumn(dayIndex, entries, derived.tz, derived.today, 12);
    }
    el.board.innerHTML = html;
  } else {
    el.board.dataset.view = 'day';
    const dayIndex = Number(state.day);
    const entries = selected.sort((a, b) => a.at - b.at || displayTitle(a.media).localeCompare(displayTitle(b.media)));
    el.board.innerHTML = dayColumn(dayIndex, entries, derived.tz, derived.today);
  }
}

function extraStatusLine(media) {
  if (media.status === 'NOT_YET_RELEASED') {
    return media.startDate ? `Premieres ${partialDate(media.startDate)}` : 'Premiere date TBA';
  }
  if (media.status === 'RELEASING') {
    return 'On break this week';
  }
  if (media.status === 'FINISHED') {
    if (media.format === 'MOVIE' || media.format === 'SPECIAL' || media.episodes === 1) return 'Finished';
    return media.episodes ? `Finished · ${media.episodes} eps` : 'Finished';
  }
  return statusLabel(media.status);
}

export function renderExtras() {
  if (!state.data || !state.derived) return;
  const extras = filteredExtras();

  if (!extras.length) {
    el.extras.hidden = true;
    el.extrasGrid.innerHTML = '';
    return;
  }

  extras.sort((a, b) => {
    const rank = (media) => (media.status === 'NOT_YET_RELEASED' ? 0 : media.status === 'RELEASING' ? 1 : 2);
    const rankDiff = rank(a) - rank(b);
    if (rankDiff !== 0) return rankDiff;
    if (rank(a) === 0) {
      const aTime = a.startDate && a.startDate.year ? Date.UTC(a.startDate.year, (a.startDate.month || 1) - 1, a.startDate.day || 1) : Infinity;
      const bTime = b.startDate && b.startDate.year ? Date.UTC(b.startDate.year, (b.startDate.month || 1) - 1, b.startDate.day || 1) : Infinity;
      if (aTime !== bTime) return aTime - bTime;
    }
    return b.popularity - a.popularity;
  });

  el.extras.hidden = false;
  el.extrasGrid.innerHTML = extras.map((media, index) => {
    const cover = assetUrl(media.coverSmall || media.cover);
    const starred = state.watchlist.has(media.id);
    return `<article class="extra-card" style="--tint:${safeColor(media.color)};--i:${Math.min(index, 10)}">
      <button type="button" class="slot-hit" data-open="${media.id}" aria-label="View details for ${escAttr(displayTitle(media))}"></button>
      <div class="extra-poster" style="--tint:${safeColor(media.color)}">
        <span class="thumb-letter" aria-hidden="true">${esc(initialFor(media))}</span>
        ${cover ? `<img src="${escAttr(cover)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ''}
      </div>
      <div class="extra-info">
        <span class="extra-tag">${esc(formatLabel(media.format))} · ${esc(statusLabel(media.status))}</span>
        <h3 class="extra-title">${esc(displayTitle(media))}</h3>
        <p class="extra-meta">${esc(extraStatusLine(media))}</p>
      </div>
      <button type="button" class="star extra-star ${starred ? 'is-starred' : ''}" data-star="${media.id}" aria-label="${starred ? 'Remove' : 'Add'} ${escAttr(displayTitle(media))} ${starred ? 'from' : 'to'} watchlist" aria-pressed="${starred}">
        <svg aria-hidden="true"><use href="#i-star"></use></svg>
      </button>
    </article>`;
  }).join('');
}

function nextMetaText(next) {
  const tz = activeTz();
  const at = next.at * 1000;
  const isToday = dateKey(at, tz) === dateKey(Date.now(), tz);
  const when = isToday ? 'Today' : `${DOW[weekdayIndex(at, tz)]} ${formatDate(at, tz)}`;
  const episode = next.ep != null ? `EP ${next.ep}` : 'Premiere';
  return `${episode} · ${when} · ${formatTime(at, tz)} ${zoneLabel()}`;
}

export function renderNext() {
  const next = findNextAiring();
  state.nextAiring = next;

  if (!next) {
    el.nextPanel.dataset.id = '';
    el.countdown.className = 'countdown is-idle';
    el.countdown.textContent = '—';
    el.nextTitle.textContent = 'The week is wrapped';
    el.nextMeta.textContent = 'Check back Monday for the next slate.';
    el.nextFootText.textContent = 'All times ' + zoneLabel();
    return;
  }

  el.nextPanel.dataset.id = String(next.id);
  el.nextTitle.textContent = displayTitle(next.media);
  el.nextMeta.textContent = nextMetaText(next);
  el.nextFootText.textContent = state.source === 'snapshot'
    ? (state.refreshing ? 'Syncing with AniList…' : 'Offline snapshot')
    : 'Live schedule';
  updateCountdown();
}

export function updateCountdown() {
  const next = state.nextAiring;
  const countdown = el.countdown;

  if (!next) {
    countdown.className = 'countdown is-idle';
    countdown.textContent = '—';
    return;
  }

  const diff = next.at * 1000 - Date.now();
  countdown.className = 'countdown';

  if (diff <= 0) {
    countdown.classList.add('is-soon');
    countdown.textContent = 'ON AIR';
    return;
  }

  const seconds = Math.floor(diff / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) {
    countdown.classList.add('is-long');
    countdown.textContent = `${days}d ${pad2(hours)}:${pad2(minutes)}:${pad2(secs)}`;
  } else {
    countdown.textContent = `${pad2(hours)}:${pad2(minutes)}:${pad2(secs)}`;
  }

  if (diff < 3600000) countdown.classList.add('is-soon');
}

export function updateCardStates() {
  if (!state.data) return;
  const now = Date.now();
  const tz = activeTz();

  $$('#board .slot').forEach((slot) => {
    const stateNode = slot.querySelector('.slot-state');
    if (!stateNode) return;
    const at = Number(stateNode.dataset.at) * 1000;
    const duration = Number(stateNode.dataset.dur) || 24;
    const info = airingState(at, duration, now);
    stateNode.textContent = info.label;
    slot.classList.toggle('is-past', info.cls === 'is-past');
    slot.classList.toggle('is-live', info.cls === 'is-live');
  });

  $$('#board [data-now]').forEach((node) => {
    node.textContent = `Now ${formatTime(now, tz)}`;
  });
}

export function renderFooter() {
  const tz = activeTz();
  el.footerZone.textContent = `${tz}${state.tzMode === 'jst' ? ' · JST' : ' · Local'}`;
  el.nextZone.textContent = zoneLabel();

  const sourceLabels = {
    live: 'Live · AniList',
    cache: 'Cached · AniList',
    snapshot: 'Snapshot · AniList'
  };
  el.dataSource.textContent = sourceLabels[state.source] || 'AniList';

  if (!state.fetchedAt) {
    el.updatedAt.textContent = '—';
    return;
  }

  if (state.source === 'snapshot') {
    el.updatedAt.textContent = `from ${formatDate(state.fetchedAt, tz)}`;
  } else if (state.source === 'cache') {
    el.updatedAt.textContent = `saved ${timeAgo(state.fetchedAt, tz)}`;
  } else {
    el.updatedAt.textContent = `updated ${timeAgo(state.fetchedAt, tz)}`;
  }
}

export function showNotice(message) {
  el.noticeText.textContent = message;
  el.notice.hidden = false;
}

export function clearNotice() {
  el.notice.hidden = true;
}

export function renderFilterOptions() {
  if (!state.data) return;

  const genres = new Map();
  for (const media of state.data.media) {
    for (const genre of media.genres) genres.set(genre, (genres.get(genre) || 0) + 1);
  }
  const genreList = Array.from(genres.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!genreList.some(([genre]) => genre === state.genre)) state.genre = 'all';

  el.genre.innerHTML = '<option value="all">All genres</option>' +
    genreList.map(([genre]) => `<option value="${escAttr(genre)}">${esc(genre)}</option>`).join('');
  el.genre.value = state.genre;

  const formats = Array.from(new Set(state.data.media.map((media) => media.format).filter(Boolean)));
  formats.sort((a, b) => {
    const aIndex = FORMAT_ORDER.indexOf(a);
    const bIndex = FORMAT_ORDER.indexOf(b);
    const aRank = aIndex === -1 ? 99 : aIndex;
    const bRank = bIndex === -1 ? 99 : bIndex;
    return aRank - bRank || a.localeCompare(b);
  });
  if (!formats.includes(state.format)) state.format = 'all';

  el.format.innerHTML = '<option value="all">All formats</option>' +
    formats.map((format) => `<option value="${escAttr(format)}">${esc(formatLabel(format))}</option>`).join('');
  el.format.value = state.format;
}

export function updateWatchCount() {
  el.watchlistCount.textContent = state.watchlist.size;
}

export function syncWatchButtons(id, starred) {
  const media = state.mediaById.get(id);
  const title = media ? displayTitle(media) : 'this show';

  $$(`[data-star="${id}"]`).forEach((button) => {
    button.classList.toggle('is-starred', starred);
    button.setAttribute('aria-pressed', String(starred));
    if (button.dataset.watchLabel) {
      const label = button.querySelector('[data-label]');
      if (label) label.textContent = starred ? 'In watchlist' : 'Add to watchlist';
    } else {
      button.setAttribute('aria-label', `${starred ? 'Remove' : 'Add'} ${title} ${starred ? 'from' : 'to'} watchlist`);
    }
  });
}

export function updateClearButton() {
  const active = Boolean(state.query) || state.genre !== 'all' || state.format !== 'all' ||
    state.watchlistOnly || !state.seasonalOnly;
  el.clearFilters.hidden = !active;
}
