/* Application controller: data loading, filters, watchlist, events and boot. */

import { TZ_LOCAL } from './config.js';
import { fetchSeason, fetchWeek, normalizePayload, readCache, saveCache, weekFetchBounds } from './api.js';
import { dateKey, formatClock, formatDateFull, seasonOf, startOfWeek, timeAgo, weekdayIndex } from './datetime.js';
import { closeDetail, openDetail } from './detail.js';
import {
  clearNotice,
  renderAll,
  renderBoard,
  renderErrorState,
  renderExtras,
  renderFilterOptions,
  renderFooter,
  renderLoadingState,
  renderNext,
  renderTabs,
  showNotice,
  syncWatchButtons,
  updateCardStates,
  updateClearButton,
  updateCountdown,
  updateTabActive,
  updateWatchCount
} from './render.js';
import { findNextAiring } from './schedule.js';
import { activeTz, el, state } from './state.js';
import { $$, shortCity, store } from './utils.js';

const FALLBACK = window.ANIME_FALLBACK || null;

async function loadLive() {
  if (state.refreshing) return;
  state.refreshing = true;
  setRefreshingUI(true);

  const season = seasonOf(new Date());

  try {
    const bounds = weekFetchBounds();
    const [seasonMedia, weekAirings] = await Promise.all([
      fetchSeason(season.season, season.year),
      fetchWeek(bounds.start, bounds.end)
    ]);

    if (!seasonMedia.length) throw new Error('No season data returned');

    const data = normalizePayload({
      season: season.season,
      year: season.year,
      seasonMedia,
      weekAirings
    });

    saveCache(data);
    state.source = 'live';
    state.fetchedAt = Date.now();
    applyData(data, 'live', Date.now());
    clearNotice();
  } catch (error) {
    console.warn('[Anime Chart] Live data unavailable:', error);

    if (!state.data && FALLBACK) {
      applyData(FALLBACK, 'snapshot', Date.parse(FALLBACK.generatedAt) || Date.now());
    }

    if (state.data) {
      const snapshotDate = FALLBACK && FALLBACK.generatedAt
        ? formatDateFull(Date.parse(FALLBACK.generatedAt), activeTz())
        : 'an earlier date';
      const label = state.source === 'snapshot'
        ? `Live data is unavailable right now — showing the bundled snapshot from ${snapshotDate}.`
        : `Couldn't refresh the schedule — showing data saved ${timeAgo(state.fetchedAt, activeTz())}.`;
      showNotice(label);
    } else {
      showNotice('Could not reach AniList. Check your connection and try again.');
      renderErrorState('The schedule could not be loaded. Check your connection, then try again.');
    }
    renderFooter();
  } finally {
    state.refreshing = false;
    setRefreshingUI(false);
  }
}

function applyData(data, source, fetchedAt) {
  if (!data || !Array.isArray(data.media) || !Array.isArray(data.week)) return;

  const openId = el.detail.open ? state.openMediaId : null;

  state.data = data;
  state.source = source;
  state.fetchedAt = fetchedAt || Date.now();
  state.loading = false;
  state.mediaById = new Map(data.media.map((media) => [media.id, media]));
  state.nextAiring = null;

  renderFilterOptions();
  renderAll();

  if (openId && state.mediaById.has(openId)) openDetail(openId);
  else if (openId) closeDetail();
}

function setRefreshingUI(refreshing) {
  el.refresh.classList.toggle('is-spinning', refreshing);
  el.refresh.disabled = refreshing;
  el.refresh.setAttribute('aria-busy', String(refreshing));
  if (state.data) renderNext();
}

function toggleWatch(id) {
  const starred = !state.watchlist.has(id);
  if (starred) state.watchlist.add(id);
  else state.watchlist.delete(id);

  store.set('animechart:watchlist', JSON.stringify(Array.from(state.watchlist)));
  updateWatchCount();
  syncWatchButtons(id, starred);

  if (state.watchlistOnly) {
    renderBoard();
    renderExtras();
  }
}

function syncTitleLangUI() {
  $$('.lang-toggle button').forEach((button) => {
    const active = button.dataset.lang === state.titleLang;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function setTitleLang(lang) {
  const next = lang === 'english' ? 'english' : 'romaji';
  if (next === state.titleLang) return;

  state.titleLang = next;
  store.set('animechart:title-lang', next);
  syncTitleLangUI();
  renderAll();

  if (el.detail.open && state.openMediaId) openDetail(state.openMediaId);
}

function syncPills() {
  el.seasonalToggle.classList.toggle('is-on', state.seasonalOnly);
  el.seasonalToggle.setAttribute('aria-pressed', String(state.seasonalOnly));
  el.watchlistToggle.classList.toggle('is-on', state.watchlistOnly);
  el.watchlistToggle.setAttribute('aria-pressed', String(state.watchlistOnly));
}

function clearFilters() {
  state.query = '';
  state.genre = 'all';
  state.format = 'all';
  state.watchlistOnly = false;
  state.seasonalOnly = true;
  state.day = 'all';
  state.dayAuto = false;
  el.search.value = '';
  el.genre.value = 'all';
  el.format.value = 'all';
  store.set('animechart:seasonal', '1');
  syncPills();
  updateTabActive();
  renderAll();
}

function setDay(day) {
  state.day = day === 'all' ? 'all' : Number(day);
  state.dayAuto = false;
  updateTabActive();
  renderBoard();
}

function tick() {
  if (el.clockTime) {
    el.clockTime.textContent = formatClock(Date.now(), activeTz());
    el.clockZone.textContent = state.tzMode === 'jst' ? 'JST' : shortCity(TZ_LOCAL);
  }

  if (!state.data) return;

  // roll the board over at midnight, and pull a new week when Monday arrives
  if (state.derived && dateKey(Date.now(), activeTz()) !== state.derived.dayKey) {
    const currentWeekStart = startOfWeek(Date.now(), activeTz());
    state.derived.dayKey = dateKey(Date.now(), activeTz());
    if (currentWeekStart !== state.derived.week.start) loadLive();
    else renderAll();
  }

  const previous = state.nextAiring;
  const next = findNextAiring();
  state.nextAiring = next;

  if (!next) {
    if (previous) renderNext();
    return;
  }

  if (!previous || previous.id !== next.id || previous.at !== next.at) {
    renderNext();
  } else {
    updateCountdown();
  }
}

function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function bindEvents() {
  syncTitleLangUI();
  $$('.lang-toggle button').forEach((button) => {
    button.addEventListener('click', () => setTitleLang(button.dataset.lang));
  });

  $$('.tz-toggle button').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.tz === state.tzMode);
    button.setAttribute('aria-pressed', String(button.dataset.tz === state.tzMode));
    button.addEventListener('click', () => {
      if (button.dataset.tz === state.tzMode) return;
      state.tzMode = button.dataset.tz === 'jst' ? 'jst' : 'local';
      store.set('animechart:tz', state.tzMode);
      if (state.dayAuto) state.day = weekdayIndex(Date.now(), activeTz());
      $$('.tz-toggle button').forEach((item) => {
        const active = item.dataset.tz === state.tzMode;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      renderAll();
      tick();
    });
  });

  el.refresh.addEventListener('click', () => loadLive());
  el.noticeRetry.addEventListener('click', () => loadLive());

  let searchTimer = null;
  el.search.addEventListener('input', () => {
    state.query = el.search.value.trim();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      renderBoard();
      renderExtras();
      updateClearButton();
    }, 90);
  });

  el.search.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && el.search.value) {
      event.stopPropagation();
      el.search.value = '';
      state.query = '';
      renderBoard();
      renderExtras();
      updateClearButton();
    }
  });

  el.genre.addEventListener('change', () => {
    state.genre = el.genre.value;
    renderBoard();
    renderExtras();
    updateClearButton();
  });

  el.format.addEventListener('change', () => {
    state.format = el.format.value;
    renderBoard();
    renderExtras();
    updateClearButton();
  });

  el.seasonalToggle.addEventListener('click', () => {
    state.seasonalOnly = !state.seasonalOnly;
    store.set('animechart:seasonal', state.seasonalOnly ? '1' : '0');
    syncPills();
    renderTabs();
    renderBoard();
    renderExtras();
    renderNext();
    updateClearButton();
  });

  el.watchlistToggle.addEventListener('click', () => {
    state.watchlistOnly = !state.watchlistOnly;
    syncPills();
    renderTabs();
    renderBoard();
    renderExtras();
    updateClearButton();
  });

  el.clearFilters.addEventListener('click', clearFilters);
  el.emptyReset.addEventListener('click', () => {
    if (!state.data) loadLive();
    else clearFilters();
  });

  el.dayTabs.addEventListener('click', (event) => {
    const button = event.target.closest('[data-day]');
    if (button) setDay(button.dataset.day);
  });

  document.addEventListener('click', (event) => {
    const star = event.target.closest('[data-star]');
    if (star) {
      event.preventDefault();
      event.stopPropagation();
      toggleWatch(Number(star.dataset.star));
      return;
    }

    const more = event.target.closest('[data-more]');
    if (more) {
      event.preventDefault();
      setDay(more.dataset.more);
      const tab = el.dayTabs.querySelector(`[data-day="${state.day}"]`);
      if (tab) tab.focus({ preventScroll: true });
      const schedule = document.querySelector('.schedule');
      if (schedule) schedule.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const opener = event.target.closest('[data-open]');
    if (opener) {
      event.preventDefault();
      openDetail(Number(opener.dataset.open));
    }
  });

  el.nextPanel.addEventListener('click', () => {
    if (state.nextAiring) openDetail(state.nextAiring.id);
  });

  el.nextPanel.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (state.nextAiring) openDetail(state.nextAiring.id);
    }
  });

  el.detailClose.addEventListener('click', closeDetail);

  el.detail.addEventListener('click', (event) => {
    if (event.target === el.detail) closeDetail();
  });

  el.detail.addEventListener('close', () => {
    state.openMediaId = null;
    document.body.classList.remove('has-dialog');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !isTypingTarget(event.target) && !el.detail.open) {
      event.preventDefault();
      el.search.focus();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    tick();
    if (state.data && Date.now() - state.fetchedAt > 15 * 60 * 1000) loadLive();
  });
}

function init() {
  bindEvents();
  syncPills();

  if (window.matchMedia('(max-width: 860px)').matches) {
    state.day = weekdayIndex(Date.now(), activeTz());
    state.dayAuto = true;
  }

  const season = seasonOf(new Date());
  const cached = readCache(season.season, season.year);

  if (cached) {
    applyData(cached.data, 'cache', cached.savedAt);
  } else if (FALLBACK && FALLBACK.season === season.season && FALLBACK.seasonYear === season.year) {
    applyData(FALLBACK, 'snapshot', Date.parse(FALLBACK.generatedAt) || Date.now());
  } else {
    renderLoadingState();
  }

  if (el.clockTime) {
    el.clockTime.textContent = formatClock(Date.now(), activeTz());
    el.clockZone.textContent = state.tzMode === 'jst' ? 'JST' : shortCity(TZ_LOCAL);
  }

  tick();
  setInterval(tick, 1000);
  setInterval(() => {
    updateCardStates();
    renderFooter();
  }, 30000);

  loadLive();
}

export { init };
