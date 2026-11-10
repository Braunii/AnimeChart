/* Derived schedule, search matching and filter predicates. */

import { dateKey, weekRange, weekdayIndex } from './datetime.js';
import { activeTz, state } from './state.js';

export function computeDerived() {
  const tz = activeTz();
  const week = weekRange(tz);
  const today = weekdayIndex(Date.now(), tz);
  const airings = [];
  const weekSet = new Set();
  const seen = new Set();

  for (const entry of state.data.week) {
    const at = entry.at * 1000;
    if (at < week.start || at >= week.end) continue;

    const media = state.mediaById.get(entry.id);
    if (!media) continue;

    const key = `${entry.id}:${entry.ep}:${entry.at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    weekSet.add(entry.id);

    airings.push({
      id: entry.id,
      at: entry.at,
      ep: entry.ep,
      media,
      day: weekdayIndex(at, tz)
    });
  }

  return { tz, week, today, airings, weekSet, dayKey: dateKey(Date.now(), tz) };
}

/**
 * Search intentionally checks romaji, English and native titles at the same
 * time, regardless of which language is currently displayed.
 */
export function matchesQuery(media, rawQuery) {
  if (!rawQuery) return true;
  const haystack = [
    media.title.romaji,
    media.title.english,
    media.title.native,
    ...media.genres,
    ...media.studios
  ].join(' ').toLowerCase();
  return rawQuery.toLowerCase().split(/\s+/).filter(Boolean).every((term) => haystack.includes(term));
}

export function passesFilters(media) {
  if (state.seasonalOnly && media.continuing) return false;
  if (state.genre !== 'all' && !media.genres.includes(state.genre)) return false;
  if (state.format !== 'all' && media.format !== state.format) return false;
  if (state.watchlistOnly && !state.watchlist.has(media.id)) return false;
  if (!matchesQuery(media, state.query)) return false;
  return true;
}

export function nextForMedia(media) {
  const now = Date.now();
  let best = null;

  for (const entry of state.data.week) {
    if (entry.id !== media.id) continue;
    const at = entry.at * 1000;
    if (at > now && (!best || at < best.at)) best = { at, ep: entry.ep };
  }

  const upcoming = media.nextAiringEpisode;
  if (upcoming && upcoming.airingAt) {
    const at = upcoming.airingAt * 1000;
    if (at > now && (!best || at < best.at)) best = { at, ep: upcoming.episode };
  }

  return best;
}

export function findNextAiring() {
  if (!state.data) return null;
  const now = Date.now();
  let best = null;

  for (const entry of state.data.week) {
    const at = entry.at * 1000;
    if (at <= now) continue;

    const media = state.mediaById.get(entry.id);
    if (!media) continue;
    if (state.seasonalOnly && media.continuing) continue;

    if (!best || at < best.at * 1000) {
      best = { id: media.id, at: entry.at, ep: entry.ep, media };
    }
  }

  for (const media of state.data.media) {
    const upcoming = media.nextAiringEpisode;
    if (!upcoming || !upcoming.airingAt) continue;
    if (state.seasonalOnly && media.continuing) continue;

    const at = upcoming.airingAt * 1000;
    if (at <= now) continue;
    if (best && (best.id === media.id || at >= best.at * 1000)) continue;
    best = { id: media.id, at: upcoming.airingAt, ep: upcoming.episode, media };
  }

  return best;
}

export function filteredExtras() {
  if (!state.data || !state.derived) return [];
  const weeklyIds = state.derived.weekSet;
  return state.data.media
    .filter((media) => !media.continuing && !weeklyIds.has(media.id))
    .filter((media) => passesFilters(media));
}
