/* AniList GraphQL access, normalization and week cache. */

import { API_URL, CACHE_MAX_AGE, CACHE_PREFIX, TZ_JST, TZ_LOCAL } from './config.js';
import { startOfWeek } from './datetime.js';
import { assetUrl, cleanDescription, safeColor, sleep, store } from './utils.js';

const MEDIA_FIELDS = `
  id
  title { romaji english native }
  coverImage { extraLarge large color }
  bannerImage
  startDate { year month day }
  endDate { year month day }
  episodes duration status format season seasonYear
  nextAiringEpisode { airingAt timeUntilAiring episode }
  genres averageScore popularity description(asHtml: false)
  studios(isMain: true) { nodes { name } }
  siteUrl
`;

const SEASON_QUERY = `
  query ($page: Int, $season: MediaSeason, $year: Int) {
    Page(page: $page, perPage: 50) {
      pageInfo { hasNextPage }
      media(season: $season, seasonYear: $year, type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
        ${MEDIA_FIELDS}
        airingSchedule(perPage: 50) { nodes { airingAt episode } }
      }
    }
  }
`;

const WEEK_QUERY = `
  query ($page: Int, $start: Int, $end: Int) {
    Page(page: $page, perPage: 50) {
      pageInfo { hasNextPage }
      airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
        airingAt episode
        media {
          ${MEDIA_FIELDS}
        }
      }
    }
  }
`;

async function gql(query, variables) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal
    });

    if (!response.ok) throw new Error(`AniList responded with ${response.status}`);

    const json = await response.json();
    if (json.errors && json.errors.length) {
      throw new Error(json.errors.map((error) => error.message).join('; '));
    }
    if (!json.data) throw new Error('AniList returned an empty response');
    return json.data;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchSeason(season, year) {
  const media = [];
  for (let page = 1; page <= 5; page += 1) {
    const data = await gql(SEASON_QUERY, { page, season, year });
    const pageData = data.Page;
    media.push(...pageData.media);
    if (!pageData.pageInfo.hasNextPage) break;
    await sleep(140);
  }
  return media;
}

export async function fetchWeek(start, end) {
  const airings = [];
  for (let page = 1; page <= 8; page += 1) {
    const data = await gql(WEEK_QUERY, { page, start, end });
    const pageData = data.Page;
    airings.push(...pageData.airingSchedules);
    if (!pageData.pageInfo.hasNextPage) break;
    await sleep(140);
  }
  return airings;
}

export function weekFetchBounds() {
  const now = Date.now();
  const starts = [startOfWeek(now, TZ_LOCAL), startOfWeek(now, TZ_JST)];
  const earliest = Math.min(...starts) - 6 * 3600 * 1000;
  const latest = Math.max(...starts) + 7 * 86400 * 1000 + 6 * 3600 * 1000;
  return { start: Math.floor(earliest / 1000), end: Math.floor(latest / 1000) };
}

export function normalizeMedia(media, continuing) {
  const cover = media.coverImage || {};
  const title = media.title || {};

  return {
    id: media.id,
    title: {
      romaji: title.romaji || '',
      english: title.english || '',
      native: title.native || ''
    },
    cover: assetUrl(cover.extraLarge) || assetUrl(cover.large),
    coverSmall: assetUrl(cover.large) || assetUrl(cover.extraLarge),
    banner: assetUrl(media.bannerImage),
    color: safeColor(cover.color),
    startDate: media.startDate || null,
    endDate: media.endDate || null,
    episodes: media.episodes || null,
    duration: media.duration || null,
    status: media.status || '',
    format: media.format || '',
    season: media.season || null,
    seasonYear: media.seasonYear || null,
    nextAiringEpisode: media.nextAiringEpisode || null,
    genres: Array.isArray(media.genres) ? media.genres : [],
    score: media.averageScore || null,
    popularity: media.popularity || 0,
    description: cleanDescription(media.description),
    studios: (media.studios && media.studios.nodes ? media.studios.nodes : []).map((node) => node.name),
    siteUrl: assetUrl(media.siteUrl) || '',
    schedule: (media.airingSchedule && media.airingSchedule.nodes ? media.airingSchedule.nodes : [])
      .filter((node) => node && node.airingAt)
      .map((node) => [node.airingAt, node.episode])
      .sort((a, b) => a[0] - b[0]),
    continuing: Boolean(continuing)
  };
}

export function normalizePayload({ season, year, seasonMedia, weekAirings }) {
  const media = seasonMedia.filter((item) => item && item.id).map((item) => normalizeMedia(item, false));
  const byId = new Map(media.map((item) => [item.id, item]));

  for (const airing of weekAirings) {
    if (!airing.media || byId.has(airing.media.id)) continue;
    const extra = normalizeMedia(airing.media, true);
    media.push(extra);
    byId.set(extra.id, extra);
  }

  const week = [];
  const seen = new Set();
  for (const airing of weekAirings) {
    if (!airing.media || !byId.has(airing.media.id)) continue;
    const key = `${airing.media.id}:${airing.episode}:${airing.airingAt}`;
    if (seen.has(key)) continue;
    seen.add(key);
    week.push({ id: airing.media.id, at: airing.airingAt, ep: airing.episode });
  }
  week.sort((a, b) => a.at - b.at);

  return {
    season,
    seasonYear: year,
    generatedAt: new Date().toISOString(),
    media,
    week
  };
}

export function cacheKey(season, year) {
  return `${CACHE_PREFIX}:${season}:${year}:${startOfWeek(Date.now(), TZ_LOCAL)}`;
}

export function readCache(season, year) {
  try {
    const raw = store.get(cacheKey(season, year));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.data || !Array.isArray(parsed.data.media) || !Array.isArray(parsed.data.week)) return null;
    if (parsed.data.season !== season || parsed.data.seasonYear !== year) return null;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > CACHE_MAX_AGE) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

export function saveCache(data) {
  try {
    store.set(cacheKey(data.season, data.seasonYear), JSON.stringify({ savedAt: Date.now(), data }));
  } catch (_) {
    /* quota / private mode */
  }
}
