/* Central application state and cached DOM references. */

import { TZ_JST, TZ_LOCAL } from './config.js';
import { $, shortCity, store } from './utils.js';

const savedWatchlist = (() => {
  try {
    const parsed = JSON.parse(store.get('animechart:watchlist') || '[]');
    return Array.isArray(parsed) ? parsed.filter((id) => Number.isFinite(id)) : [];
  } catch (_) {
    return [];
  }
})();

export const state = {
  data: null,
  source: 'none',
  fetchedAt: null,
  loading: true,
  refreshing: false,
  tzMode: store.get('animechart:tz') === 'jst' ? 'jst' : 'local',
  titleLang: store.get('animechart:title-lang') === 'english' ? 'english' : 'romaji',
  day: 'all',
  dayAuto: false,
  query: '',
  genre: 'all',
  format: 'all',
  seasonalOnly: store.get('animechart:seasonal') !== '0',
  watchlistOnly: false,
  watchlist: new Set(savedWatchlist),
  mediaById: new Map(),
  derived: null,
  nextAiring: null,
  openMediaId: null
};

export const el = {
  clockTime: $('#clock-time'),
  clockZone: $('#clock-zone'),
  seasonKicker: $('#season-kicker'),
  seasonTitle: $('#season-title'),
  statTitles: $('#stat-titles'),
  statAiring: $('#stat-airing'),
  statEpisodes: $('#stat-episodes'),
  seasonWeek: $('#season-week'),
  seasonDays: $('#season-days'),
  seasonMeter: $('#season-meter'),
  seasonMeterFill: $('#season-meter-fill'),
  nextPanel: $('#next-panel'),
  nextZone: $('#next-zone'),
  countdown: $('#countdown'),
  nextTitle: $('#next-title'),
  nextMeta: $('#next-meta'),
  nextFootText: $('#next-foot-text'),
  notice: $('#notice'),
  noticeText: $('#notice-text'),
  noticeRetry: $('#notice-retry'),
  weekTitle: $('#week-title'),
  dayTabs: $('#day-tabs'),
  search: $('#search'),
  genre: $('#genre-filter'),
  format: $('#format-filter'),
  seasonalToggle: $('#seasonal-toggle'),
  watchlistToggle: $('#watchlist-toggle'),
  watchlistCount: $('#watchlist-count'),
  clearFilters: $('#clear-filters'),
  resultCount: $('#result-count'),
  board: $('#board'),
  empty: $('#empty'),
  emptyText: $('#empty-text'),
  emptyReset: $('#empty-reset'),
  loading: $('#loading'),
  extras: $('#extras'),
  extrasGrid: $('#extras-grid'),
  extrasTitle: $('#extras-title'),
  footerZone: $('#footer-zone'),
  dataSource: $('#data-source'),
  updatedAt: $('#updated-at'),
  refresh: $('#refresh'),
  detail: $('#detail'),
  detailContent: $('#detail-content'),
  detailClose: $('#detail-close')
};

export function activeTz() {
  return state.tzMode === 'jst' ? TZ_JST : TZ_LOCAL;
}

export function zoneLabel() {
  return state.tzMode === 'jst' ? 'JST' : shortCity(TZ_LOCAL);
}
