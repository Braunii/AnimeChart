/* Generated from js/modules via esbuild. Rebuild after editing modules. */
(() => {
  // ../anime chart/js/modules/config.js
  var API_URL = "https://graphql.anilist.co";
  var CACHE_PREFIX = "animechart:data:v1";
  var CACHE_MAX_AGE = 24 * 60 * 60 * 1e3;
  var TZ_LOCAL = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  var TZ_JST = "Asia/Tokyo";
  var SEASONS = ["WINTER", "SPRING", "SUMMER", "FALL"];
  var SEASON_LABEL = { WINTER: "Winter", SPRING: "Spring", SUMMER: "Summer", FALL: "Fall" };
  var SEASON_KICKER = { WINTER: "Winter", SPRING: "Spring", SUMMER: "Summer", FALL: "Autumn" };
  var SEASON_JP = { WINTER: "\u51AC\u30A2\u30CB\u30E1", SPRING: "\u6625\u30A2\u30CB\u30E1", SUMMER: "\u590F\u30A2\u30CB\u30E1", FALL: "\u79CB\u30A2\u30CB\u30E1" };
  var SEASON_START_MONTH = { WINTER: 0, SPRING: 3, SUMMER: 6, FALL: 9 };
  var DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  var DOW_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var FORMAT_LABEL = {
    TV: "TV",
    TV_SHORT: "TV Short",
    ONA: "ONA",
    OVA: "OVA",
    MOVIE: "Film",
    SPECIAL: "Special",
    MUSIC: "Music"
  };
  var STATUS_LABEL = {
    RELEASING: "Airing",
    FINISHED: "Finished",
    NOT_YET_RELEASED: "Upcoming",
    CANCELLED: "Cancelled",
    HIATUS: "On hiatus"
  };
  var FORMAT_ORDER = ["TV", "ONA", "TV_SHORT", "OVA", "MOVIE", "SPECIAL"];

  // ../anime chart/js/modules/datetime.js
  var formatterCache = /* @__PURE__ */ new Map();
  function formatter(tz, options) {
    const key = tz + "|" + JSON.stringify(options);
    let fmt = formatterCache.get(key);
    if (!fmt) {
      fmt = new Intl.DateTimeFormat("en-US", Object.assign({ timeZone: tz }, options));
      formatterCache.set(key, fmt);
    }
    return fmt;
  }
  function tzParts(ms, tz) {
    const parts = formatter(tz, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date(ms));
    const out = {};
    for (const part of parts) {
      if (part.type !== "literal") out[part.type] = Number(part.value);
    }
    return out;
  }
  function tzOffsetMs(ms, tz) {
    const p = tzParts(ms, tz);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    return asUtc - Math.floor(ms / 1e3) * 1e3;
  }
  function zonedToUtc(year, month, day, hour = 0, minute = 0, tz = TZ_LOCAL) {
    const target = Date.UTC(year, month, day, hour, minute, 0);
    let guess = target;
    for (let i = 0; i < 3; i += 1) {
      const offset = tzOffsetMs(guess, tz);
      const next = target - offset;
      if (next === guess) break;
      guess = next;
    }
    return guess;
  }
  function startOfWeek(ms, tz) {
    const p = tzParts(ms, tz);
    const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
    const mondayOffset = (weekday + 6) % 7;
    return zonedToUtc(p.year, p.month - 1, p.day - mondayOffset, 0, 0, tz);
  }
  function weekRange(tz) {
    const start = startOfWeek(Date.now(), tz);
    const p = tzParts(start, tz);
    const end = zonedToUtc(p.year, p.month - 1, p.day + 7, 0, 0, tz);
    return { start, end };
  }
  function weekdayIndex(ms, tz) {
    const p = tzParts(ms, tz);
    return (new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay() + 6) % 7;
  }
  function dateKey(ms, tz) {
    const p = tzParts(ms, tz);
    return `${p.year}-${p.month}-${p.day}`;
  }
  function formatTime(ms, tz) {
    return formatter(tz, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(ms));
  }
  function formatClock(ms, tz) {
    return formatter(tz, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(ms));
  }
  function formatDate(ms, tz) {
    return formatter(tz, { month: "short", day: "numeric" }).format(new Date(ms));
  }
  function formatDateFull(ms, tz) {
    return formatter(tz, { month: "short", day: "numeric", year: "numeric" }).format(new Date(ms));
  }
  function isoWeekNumber(ms, tz) {
    const p = tzParts(ms, tz);
    const date = new Date(Date.UTC(p.year, p.month - 1, p.day));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil(((date - yearStart) / 864e5 + 1) / 7);
  }
  function seasonOf(date) {
    const month = date.getMonth();
    return { season: SEASONS[Math.floor(month / 3)], year: date.getFullYear() };
  }
  function relativeTime(diffMs) {
    const minutes = Math.round(diffMs / 6e4);
    if (minutes < 60) return `in ${Math.max(1, minutes)}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      const rest = minutes % 60;
      return rest && hours < 10 ? `in ${hours}h ${rest}m` : `in ${hours}h`;
    }
    return `in ${Math.floor(hours / 24)}d`;
  }
  function airingState(atMs, durationMinutes, now = Date.now()) {
    const end = atMs + (durationMinutes || 24) * 6e4;
    if (now >= atMs && now < end) return { cls: "is-live", label: "on air" };
    if (now >= atMs) return { cls: "is-past", label: "aired" };
    return { cls: "", label: relativeTime(atMs - now) };
  }
  function timeAgo(ms, tz = TZ_LOCAL) {
    const seconds = Math.max(0, Math.floor((Date.now() - ms) / 1e3));
    if (seconds < 45) return "just now";
    if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return formatDate(ms, tz);
  }

  // ../anime chart/js/modules/utils.js
  var $ = (selector, root = document) => root.querySelector(selector);
  var $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  var store = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch (_) {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (_) {
      }
    }
  };
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[ch]);
  }
  var escAttr = esc;
  function pad2(number) {
    return String(number).padStart(2, "0");
  }
  function clamp(number, min, max) {
    return Math.min(max, Math.max(min, number));
  }
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  function safeColor(color) {
    return /^#[0-9a-f]{3,8}$/i.test(String(color || "")) ? color : "#3a4354";
  }
  function assetUrl(url) {
    return typeof url === "string" && /^https:\/\//i.test(url) ? url : "";
  }
  function shortCity(tz) {
    if (tz === TZ_JST) return "Tokyo";
    if (!tz) return "UTC";
    return tz.split("/").pop().replace(/_/g, " ");
  }
  function cleanDescription(html) {
    if (!html) return "";
    let text = "";
    try {
      const doc = new DOMParser().parseFromString(String(html), "text/html");
      text = doc.body ? doc.body.textContent || "" : "";
    } catch (_) {
      text = String(html).replace(/<[^>]+>/g, " ");
    }
    text = text.replace(/\s+/g, " ").trim();
    if (text.length > 1500) text = `${text.slice(0, 1500).replace(/\s+\S*$/, "")}\u2026`;
    return text;
  }

  // ../anime chart/js/modules/api.js
  var MEDIA_FIELDS = `
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
  var SEASON_QUERY = `
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
  var WEEK_QUERY = `
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
    const timeout = setTimeout(() => controller.abort(), 25e3);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`AniList responded with ${response.status}`);
      const json = await response.json();
      if (json.errors && json.errors.length) {
        throw new Error(json.errors.map((error) => error.message).join("; "));
      }
      if (!json.data) throw new Error("AniList returned an empty response");
      return json.data;
    } finally {
      clearTimeout(timeout);
    }
  }
  async function fetchSeason(season, year) {
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
  async function fetchWeek(start, end) {
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
  function weekFetchBounds() {
    const now = Date.now();
    const starts = [startOfWeek(now, TZ_LOCAL), startOfWeek(now, TZ_JST)];
    const earliest = Math.min(...starts) - 6 * 3600 * 1e3;
    const latest = Math.max(...starts) + 7 * 86400 * 1e3 + 6 * 3600 * 1e3;
    return { start: Math.floor(earliest / 1e3), end: Math.floor(latest / 1e3) };
  }
  function normalizeMedia(media, continuing) {
    const cover = media.coverImage || {};
    const title = media.title || {};
    return {
      id: media.id,
      title: {
        romaji: title.romaji || "",
        english: title.english || "",
        native: title.native || ""
      },
      cover: assetUrl(cover.extraLarge) || assetUrl(cover.large),
      coverSmall: assetUrl(cover.large) || assetUrl(cover.extraLarge),
      banner: assetUrl(media.bannerImage),
      color: safeColor(cover.color),
      startDate: media.startDate || null,
      endDate: media.endDate || null,
      episodes: media.episodes || null,
      duration: media.duration || null,
      status: media.status || "",
      format: media.format || "",
      season: media.season || null,
      seasonYear: media.seasonYear || null,
      nextAiringEpisode: media.nextAiringEpisode || null,
      genres: Array.isArray(media.genres) ? media.genres : [],
      score: media.averageScore || null,
      popularity: media.popularity || 0,
      description: cleanDescription(media.description),
      studios: (media.studios && media.studios.nodes ? media.studios.nodes : []).map((node) => node.name),
      siteUrl: assetUrl(media.siteUrl) || "",
      schedule: (media.airingSchedule && media.airingSchedule.nodes ? media.airingSchedule.nodes : []).filter((node) => node && node.airingAt).map((node) => [node.airingAt, node.episode]).sort((a, b) => a[0] - b[0]),
      continuing: Boolean(continuing)
    };
  }
  function normalizePayload({ season, year, seasonMedia, weekAirings }) {
    const media = seasonMedia.filter((item) => item && item.id).map((item) => normalizeMedia(item, false));
    const byId = new Map(media.map((item) => [item.id, item]));
    for (const airing of weekAirings) {
      if (!airing.media || byId.has(airing.media.id)) continue;
      const extra = normalizeMedia(airing.media, true);
      media.push(extra);
      byId.set(extra.id, extra);
    }
    const week = [];
    const seen = /* @__PURE__ */ new Set();
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
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      media,
      week
    };
  }
  function cacheKey(season, year) {
    return `${CACHE_PREFIX}:${season}:${year}:${startOfWeek(Date.now(), TZ_LOCAL)}`;
  }
  function readCache(season, year) {
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
  function saveCache(data) {
    try {
      store.set(cacheKey(data.season, data.seasonYear), JSON.stringify({ savedAt: Date.now(), data }));
    } catch (_) {
    }
  }

  // ../anime chart/js/modules/labels.js
  function formatLabel(format) {
    return FORMAT_LABEL[format] || format || "\u2014";
  }
  function statusLabel(status) {
    return STATUS_LABEL[status] || "\u2014";
  }
  function episodesLabel(media) {
    if (media.episodes) return `${media.episodes} ep${media.episodes === 1 ? "" : "s"}`;
    if (media.status === "RELEASING") return "Ongoing";
    return "\u2014";
  }
  function partialDate(date) {
    if (!date || !date.year) return "TBA";
    if (!date.month) return String(date.year);
    if (!date.day) return `${MONTHS[date.month - 1]} ${date.year}`;
    return `${MONTHS[date.month - 1]} ${date.day}, ${date.year}`;
  }

  // ../anime chart/js/modules/state.js
  var savedWatchlist = (() => {
    try {
      const parsed = JSON.parse(store.get("animechart:watchlist") || "[]");
      return Array.isArray(parsed) ? parsed.filter((id) => Number.isFinite(id)) : [];
    } catch (_) {
      return [];
    }
  })();
  var state = {
    data: null,
    source: "none",
    fetchedAt: null,
    loading: true,
    refreshing: false,
    tzMode: store.get("animechart:tz") === "jst" ? "jst" : "local",
    titleLang: store.get("animechart:title-lang") === "english" ? "english" : "romaji",
    day: "all",
    dayAuto: false,
    query: "",
    genre: "all",
    format: "all",
    seasonalOnly: store.get("animechart:seasonal") !== "0",
    watchlistOnly: false,
    watchlist: new Set(savedWatchlist),
    mediaById: /* @__PURE__ */ new Map(),
    derived: null,
    nextAiring: null,
    openMediaId: null
  };
  var el = {
    clockTime: $("#clock-time"),
    clockZone: $("#clock-zone"),
    seasonKicker: $("#season-kicker"),
    seasonTitle: $("#season-title"),
    statTitles: $("#stat-titles"),
    statAiring: $("#stat-airing"),
    statEpisodes: $("#stat-episodes"),
    seasonWeek: $("#season-week"),
    seasonDays: $("#season-days"),
    seasonMeter: $("#season-meter"),
    seasonMeterFill: $("#season-meter-fill"),
    nextPanel: $("#next-panel"),
    nextZone: $("#next-zone"),
    countdown: $("#countdown"),
    nextTitle: $("#next-title"),
    nextMeta: $("#next-meta"),
    nextFootText: $("#next-foot-text"),
    notice: $("#notice"),
    noticeText: $("#notice-text"),
    noticeRetry: $("#notice-retry"),
    weekTitle: $("#week-title"),
    dayTabs: $("#day-tabs"),
    search: $("#search"),
    genre: $("#genre-filter"),
    format: $("#format-filter"),
    seasonalToggle: $("#seasonal-toggle"),
    watchlistToggle: $("#watchlist-toggle"),
    watchlistCount: $("#watchlist-count"),
    clearFilters: $("#clear-filters"),
    resultCount: $("#result-count"),
    board: $("#board"),
    empty: $("#empty"),
    emptyText: $("#empty-text"),
    emptyReset: $("#empty-reset"),
    loading: $("#loading"),
    extras: $("#extras"),
    extrasGrid: $("#extras-grid"),
    extrasTitle: $("#extras-title"),
    footerZone: $("#footer-zone"),
    dataSource: $("#data-source"),
    updatedAt: $("#updated-at"),
    refresh: $("#refresh"),
    detail: $("#detail"),
    detailContent: $("#detail-content"),
    detailClose: $("#detail-close")
  };
  function activeTz() {
    return state.tzMode === "jst" ? TZ_JST : TZ_LOCAL;
  }
  function zoneLabel() {
    return state.tzMode === "jst" ? "JST" : shortCity(TZ_LOCAL);
  }

  // ../anime chart/js/modules/schedule.js
  function computeDerived() {
    const tz = activeTz();
    const week = weekRange(tz);
    const today = weekdayIndex(Date.now(), tz);
    const airings = [];
    const weekSet = /* @__PURE__ */ new Set();
    const seen = /* @__PURE__ */ new Set();
    for (const entry of state.data.week) {
      const at = entry.at * 1e3;
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
  function matchesQuery(media, rawQuery) {
    if (!rawQuery) return true;
    const haystack = [
      media.title.romaji,
      media.title.english,
      media.title.native,
      ...media.genres,
      ...media.studios
    ].join(" ").toLowerCase();
    return rawQuery.toLowerCase().split(/\s+/).filter(Boolean).every((term) => haystack.includes(term));
  }
  function passesFilters(media) {
    if (state.seasonalOnly && media.continuing) return false;
    if (state.genre !== "all" && !media.genres.includes(state.genre)) return false;
    if (state.format !== "all" && media.format !== state.format) return false;
    if (state.watchlistOnly && !state.watchlist.has(media.id)) return false;
    if (!matchesQuery(media, state.query)) return false;
    return true;
  }
  function nextForMedia(media) {
    const now = Date.now();
    let best = null;
    for (const entry of state.data.week) {
      if (entry.id !== media.id) continue;
      const at = entry.at * 1e3;
      if (at > now && (!best || at < best.at)) best = { at, ep: entry.ep };
    }
    const upcoming = media.nextAiringEpisode;
    if (upcoming && upcoming.airingAt) {
      const at = upcoming.airingAt * 1e3;
      if (at > now && (!best || at < best.at)) best = { at, ep: upcoming.episode };
    }
    return best;
  }
  function findNextAiring() {
    if (!state.data) return null;
    const now = Date.now();
    let best = null;
    for (const entry of state.data.week) {
      const at = entry.at * 1e3;
      if (at <= now) continue;
      const media = state.mediaById.get(entry.id);
      if (!media) continue;
      if (state.seasonalOnly && media.continuing) continue;
      if (!best || at < best.at * 1e3) {
        best = { id: media.id, at: entry.at, ep: entry.ep, media };
      }
    }
    for (const media of state.data.media) {
      const upcoming = media.nextAiringEpisode;
      if (!upcoming || !upcoming.airingAt) continue;
      if (state.seasonalOnly && media.continuing) continue;
      const at = upcoming.airingAt * 1e3;
      if (at <= now) continue;
      if (best && (best.id === media.id || at >= best.at * 1e3)) continue;
      best = { id: media.id, at: upcoming.airingAt, ep: upcoming.episode, media };
    }
    return best;
  }
  function filteredExtras() {
    if (!state.data || !state.derived) return [];
    const weeklyIds = state.derived.weekSet;
    return state.data.media.filter((media) => !media.continuing && !weeklyIds.has(media.id)).filter((media) => passesFilters(media));
  }

  // ../anime chart/js/modules/titles.js
  function displayTitle(media) {
    const { romaji, english, native } = media.title;
    const preferred = state.titleLang === "english" ? english : romaji;
    return preferred || romaji || english || native || "Untitled";
  }
  function altTitle(media) {
    const primary = displayTitle(media);
    const secondary = state.titleLang === "english" ? media.title.romaji : media.title.english;
    const parts = [];
    if (secondary && secondary !== primary) parts.push(secondary);
    if (media.title.native && media.title.native !== primary && media.title.native !== secondary) {
      parts.push(media.title.native);
    }
    return parts.join(" \xB7 ");
  }
  function initialFor(media) {
    const title = displayTitle(media).trim();
    return title ? title.charAt(0).toUpperCase() : "\u30A2";
  }

  // ../anime chart/js/modules/detail.js
  function factMarkup(label, value, className = "") {
    return `<div class="d-fact"><dt>${esc(label)}</dt><dd class="${className}">${value}</dd></div>`;
  }
  function broadcastSummary(media) {
    const tz = activeTz();
    const next = nextForMedia(media);
    if (next) {
      return `Next: ${DOW_LONG[weekdayIndex(next.at, tz)]}, ${formatDate(next.at, tz)} \xB7 ${formatTime(next.at, tz)} ${zoneLabel()}`;
    }
    if (media.schedule.length) {
      const last = media.schedule[media.schedule.length - 1];
      return `Aired: ${DOW_LONG[weekdayIndex(last[0] * 1e3, tz)]}, ${formatDate(last[0] * 1e3, tz)} \xB7 ${formatTime(last[0] * 1e3, tz)} ${zoneLabel()}`;
    }
    if (media.format === "MOVIE" && media.startDate) {
      return `Released ${partialDate(media.startDate)}`;
    }
    return "Broadcast time unavailable.";
  }
  function seasonRunMarkup(media) {
    const total = media.episodes;
    if (!total || total < 2 || media.format === "MOVIE") return "";
    const upcoming = nextForMedia(media);
    let current;
    if (media.status === "NOT_YET_RELEASED") current = 0;
    else if (media.status === "FINISHED") current = total;
    else if (upcoming) current = clamp(upcoming.ep - 1, 0, total);
    else current = 0;
    const percent = clamp(current / total * 100, 0, 100);
    const remaining = Math.max(0, total - current);
    const note = media.status === "FINISHED" ? "Season complete." : remaining > 0 ? `${remaining} episode${remaining === 1 ? "" : "s"} remaining.` : "Final episode has aired.";
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
      const ms = at * 1e3;
      const isPast = ms < now;
      const isNext = nextEpisode != null && episode === nextEpisode && !isPast;
      return `<div class="d-episode ${isPast ? "is-past" : ""} ${isNext ? "is-next" : ""}">
      <span class="ep-num">EP ${episode != null ? episode : "\u2014"}</span>
      <span>${esc(DOW[weekdayIndex(ms, tz)])} ${esc(formatDate(ms, tz))}</span>
      <span class="ep-date">${esc(formatTime(ms, tz))}</span>
    </div>`;
    }).join("");
  }
  function openDetail(id) {
    if (!state.data) return;
    const media = state.mediaById.get(id);
    if (!media) return;
    const title = displayTitle(media);
    const alternative = altTitle(media);
    const starred = state.watchlist.has(media.id);
    const banner = assetUrl(media.banner) || assetUrl(media.cover);
    const poster = assetUrl(media.coverSmall) || assetUrl(media.cover);
    const description = media.description || "No synopsis is available for this title yet.";
    const genres = media.genres.map((genre) => `<span class="d-tag">${esc(genre)}</span>`).join("");
    const studios = media.studios.length ? media.studios.join(", ") : "\u2014";
    const score = media.score ? `<span class="d-score">${media.score}%</span>` : '<span class="d-empty-note">Unrated</span>';
    const premiered = media.startDate ? partialDate(media.startDate) : "TBA";
    const aired = media.startDate ? `${partialDate(media.startDate)}${media.endDate ? ` \u2013 ${partialDate(media.endDate)}` : ""}` : "TBA";
    const facts = [
      factMarkup("Score", score),
      factMarkup("Format", esc(formatLabel(media.format))),
      factMarkup("Episodes", esc(episodesLabel(media))),
      factMarkup("Studio", esc(studios)),
      factMarkup("Status", esc(statusLabel(media.status))),
      factMarkup("Premiered", esc(premiered)),
      factMarkup("Aired", esc(aired))
    ].join("");
    const site = media.siteUrl ? `<a class="btn" href="${escAttr(media.siteUrl)}" target="_blank" rel="noopener noreferrer">AniList <svg aria-hidden="true"><use href="#i-external"></use></svg></a>` : "";
    el.detailContent.innerHTML = `
    <div class="d-banner ${banner ? "" : "no-banner"}" style="--tint:${safeColor(media.color)};${banner ? `background-image:url('${escAttr(banner)}')` : ""}"></div>
    <div class="d-head">
      <div class="d-poster-wrap" style="--tint:${safeColor(media.color)}">
        <span class="d-poster-letter" aria-hidden="true">${esc(initialFor(media))}</span>
        ${poster ? `<img class="d-poster" src="${escAttr(poster)}" alt="" onerror="this.remove()">` : ""}
      </div>
      <div class="d-info">
        <p class="d-eyebrow">
          <span>${esc(formatLabel(media.format))}</span><span class="dot"></span>
          <span>${esc(statusLabel(media.status))}</span><span class="dot"></span>
          <span>${esc(media.season ? `${SEASON_LABEL[media.season] || "Season"} ${media.seasonYear || ""}` : "Continuing")}</span>
        </p>
        <h2 id="detail-title">${esc(title)}</h2>
        ${alternative ? `<p class="d-alt">${esc(alternative)}</p>` : ""}
        ${genres ? `<div class="d-tags">${genres}</div>` : ""}
        <div class="d-actions">
          <button type="button" class="btn btn-accent" data-star="${media.id}" data-watch-label="1" aria-pressed="${starred}">
            <svg aria-hidden="true"><use href="#i-star"></use></svg>
            <span data-label>${starred ? "In watchlist" : "Add to watchlist"}</span>
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
      if (typeof el.detail.showModal === "function") el.detail.showModal();
      else el.detail.setAttribute("open", "");
    }
    document.body.classList.add("has-dialog");
    el.detailClose.focus({ preventScroll: true });
  }
  function closeDetail() {
    if (el.detail.open && typeof el.detail.close === "function") el.detail.close();
    else el.detail.removeAttribute("open");
    document.body.classList.remove("has-dialog");
  }

  // ../anime chart/js/modules/render.js
  function renderAll() {
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
  function renderLoadingState() {
    el.loading.hidden = false;
    el.board.hidden = true;
    el.empty.hidden = true;
    el.extras.hidden = true;
    el.board.innerHTML = "";
    el.extrasGrid.innerHTML = "";
    el.dayTabs.innerHTML = "";
    el.resultCount.textContent = "";
    el.weekTitle.innerHTML = "This week";
    el.countdown.className = "countdown is-idle";
    el.countdown.textContent = "\u2014";
    el.nextTitle.textContent = "Charting the airwaves\u2026";
    el.nextMeta.textContent = "Loading this week\u2019s schedule";
  }
  function renderErrorState(message) {
    el.loading.hidden = true;
    el.board.hidden = true;
    el.extras.hidden = true;
    el.empty.hidden = false;
    el.emptyText.textContent = message;
    el.emptyReset.textContent = "Try again";
    const heading = el.empty.querySelector("h3");
    if (heading) heading.textContent = "The schedule is out of reach";
  }
  function renderSeasonHeader() {
    var _a;
    const data = state.data;
    const label = SEASON_LABEL[data.season] || "Season";
    const year = data.seasonYear || "";
    const tz = activeTz();
    el.seasonKicker.innerHTML = `<span class="live-dot" aria-hidden="true"></span>${esc(SEASON_KICKER[data.season] || label)} ${year} \xB7 ${esc(SEASON_JP[data.season] || "")}`;
    el.seasonTitle.innerHTML = `<span class="season-word">${esc(label)}</span> <em class="season-year">${esc(year)}</em>`;
    document.title = `Anime Chart \xB7 ${label} ${year}`;
    const seasonal = data.media.filter((media) => !media.continuing);
    const seasonalAirings = state.derived.airings.filter((entry) => !entry.media.continuing);
    const uniqueShows = new Set(seasonalAirings.map((entry) => entry.id));
    el.statTitles.textContent = seasonal.length;
    el.statAiring.textContent = uniqueShows.size;
    el.statEpisodes.textContent = seasonalAirings.length;
    const startMonth = (_a = SEASON_START_MONTH[data.season]) != null ? _a : 0;
    const start = zonedToUtc(data.seasonYear, startMonth, 1, 0, 0, tz);
    const end = zonedToUtc(data.seasonYear, startMonth + 3, 1, 0, 0, tz);
    const now = Date.now();
    const progress = clamp((now - start) / (end - start) * 100, 0, 100);
    const weekNumber = clamp(Math.floor((now - start) / (7 * 864e5)) + 1, 1, 13);
    const daysLeft = Math.max(0, Math.ceil((end - now) / 864e5));
    el.seasonMeterFill.style.width = `${progress.toFixed(1)}%`;
    el.seasonMeter.setAttribute("aria-valuenow", String(Math.round(progress)));
    el.seasonWeek.textContent = `Season week ${weekNumber} of 13`;
    el.seasonDays.textContent = daysLeft <= 1 ? "Final day" : `${daysLeft} days left`;
    el.weekTitle.innerHTML = `${esc(weekTitleText(state.derived))} <span class="week-sub">Week ${isoWeekNumber(now, tz)}</span>`;
  }
  function weekTitleText(derived) {
    const { start, end } = derived.week;
    const first = tzParts(start, derived.tz);
    const last = tzParts(end - 1, derived.tz);
    if (first.month === last.month && first.year === last.year) {
      return `${MONTHS[first.month - 1]} ${first.day} \u2013 ${last.day}`;
    }
    if (first.year === last.year) {
      return `${MONTHS[first.month - 1]} ${first.day} \u2013 ${MONTHS[last.month - 1]} ${last.day}`;
    }
    return `${MONTHS[first.month - 1]} ${first.day}, ${first.year} \u2013 ${MONTHS[last.month - 1]} ${last.day}, ${last.year}`;
  }
  function renderTabs() {
    if (!state.data || !state.derived) return;
    const { tz, week, today } = state.derived;
    const counts = new Array(7).fill(0);
    for (const entry of state.derived.airings) {
      if (passesFilters(entry.media)) counts[entry.day] += 1;
    }
    let html = `<button type="button" class="day-tab tab-all ${state.day === "all" ? "is-active" : ""}" data-day="all" aria-pressed="${state.day === "all"}">All week</button>`;
    for (let index = 0; index < 7; index += 1) {
      const ms = week.start + index * 864e5 + 12 * 36e5;
      const parts = tzParts(ms, tz);
      const active = state.day === index;
      const label = `${DOW_LONG[index]}, ${MONTHS[parts.month - 1]} ${parts.day}`;
      html += `<button type="button" class="day-tab ${active ? "is-active" : ""} ${index === today ? "is-today" : ""}" data-day="${index}" aria-label="${esc(label)}${counts[index] ? `, ${counts[index]} airings` : ""}" aria-pressed="${active}">
      <span>${DOW[index]}</span><span class="tab-date">${parts.day}</span>
    </button>`;
    }
    el.dayTabs.innerHTML = html;
  }
  function updateTabActive() {
    $$(".day-tab", el.dayTabs).forEach((button) => {
      const active = button.dataset.day === String(state.day);
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }
  function dayColumn(dayIndex, entries, tz, today, limit = Infinity) {
    const ms = state.derived.week.start + dayIndex * 864e5 + 12 * 36e5;
    const parts = tzParts(ms, tz);
    const isToday = dayIndex === today;
    const now = Date.now();
    const visible = entries.slice(0, limit);
    const cards = visible.map((entry, index) => slotCard(entry, index, tz));
    if (isToday && entries.length) {
      const nowIndex = entries.findIndex((entry) => {
        const end = entry.at * 1e3 + (entry.media.duration || 24) * 6e4;
        return end > now;
      });
      const marker = `<div class="now-line" role="separator" aria-label="Current time ${esc(formatTime(now, tz))}"><span data-now>Now ${esc(formatTime(now, tz))}</span></div>`;
      if (nowIndex === -1 && visible.length === entries.length) cards.push(marker);
      else if (nowIndex >= 0 && nowIndex < cards.length) cards.splice(nowIndex, 0, marker);
    }
    const hidden = entries.length - visible.length;
    const more = hidden > 0 ? `<button type="button" class="day-more" data-more="${dayIndex}">See all ${entries.length} <span aria-hidden="true">\u2192</span></button>` : "";
    const cardsHtml = cards.length ? cards.join("") : '<p class="day-empty">No broadcasts</p>';
    return `<section class="day-col ${isToday ? "is-today" : ""}" aria-label="${DOW_LONG[dayIndex]} ${MONTHS[parts.month - 1]} ${parts.day}">
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
    const info = airingState(entry.at * 1e3, media.duration);
    const starred = state.watchlist.has(media.id);
    const cover = assetUrl(media.coverSmall || media.cover);
    const title = displayTitle(media);
    const episode = entry.ep != null ? `EP ${entry.ep}` : "EP \u2014";
    const meta = `${episode} \xB7 ${formatLabel(media.format)}${media.continuing ? " \xB7 cont." : ""}`;
    const time = formatTime(entry.at * 1e3, tz);
    return `<article class="slot ${info.cls}" style="--tint:${safeColor(media.color)};--i:${Math.min(index, 10)}">
    <button type="button" class="slot-hit" data-open="${media.id}" aria-label="View details for ${escAttr(title)}, ${escAttr(time)}"></button>
    <div class="slot-top">
      <time class="slot-time" datetime="${new Date(entry.at * 1e3).toISOString()}">${time}</time>
      <span class="slot-state" data-at="${entry.at}" data-dur="${media.duration || 24}">${info.label}</span>
      <button type="button" class="star ${starred ? "is-starred" : ""}" data-star="${media.id}" aria-label="${starred ? "Remove" : "Add"} ${escAttr(title)} ${starred ? "from" : "to"} watchlist" aria-pressed="${starred}">
        <svg aria-hidden="true"><use href="#i-star"></use></svg>
      </button>
    </div>
    <div class="slot-body">
      <div class="thumb" style="--tint:${safeColor(media.color)}">
        <span class="thumb-letter" aria-hidden="true">${esc(initialFor(media))}</span>
        ${cover ? `<img src="${escAttr(cover)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ""}
      </div>
      <div class="slot-info">
        <h3 class="slot-title">${esc(title)}</h3>
        <p class="slot-meta">${esc(meta)}</p>
      </div>
    </div>
  </article>`;
  }
  function renderBoard() {
    if (!state.data || !state.derived) return;
    const derived = state.derived;
    const base = derived.airings.filter((entry) => passesFilters(entry.media));
    const selected = state.day === "all" ? base : base.filter((entry) => entry.day === Number(state.day));
    el.resultCount.textContent = base.length ? `${base.length} ${base.length === 1 ? "airing" : "airings"}` : "";
    updateClearButton();
    if (!base.length) {
      el.board.hidden = true;
      el.board.innerHTML = "";
      el.empty.hidden = false;
      const extraCount = filteredExtras().length;
      if (state.watchlistOnly && state.watchlist.size === 0) {
        el.emptyText.textContent = "Your watchlist is empty. Star a show to pin it here.";
      } else if (extraCount > 0) {
        el.emptyText.textContent = `No weekly broadcasts match${state.query ? ` \u201C${state.query}\u201D` : ""}. ${extraCount} matching ${extraCount === 1 ? "title is" : "titles are"} listed below under films & specials.`;
      } else if (state.query) {
        el.emptyText.textContent = `No broadcasts match \u201C${state.query}\u201D.`;
      } else {
        el.emptyText.textContent = "No broadcasts match those filters.";
      }
      el.emptyReset.textContent = "Reset filters";
      const heading = el.empty.querySelector("h3");
      if (heading) heading.textContent = extraCount > 0 ? "Nothing airing weekly" : "Nothing scheduled here";
      return;
    }
    el.empty.hidden = true;
    el.board.hidden = false;
    if (state.day === "all") {
      el.board.dataset.view = "week";
      let html = "";
      for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        const entries = base.filter((entry) => entry.day === dayIndex).sort((a, b) => a.at - b.at || displayTitle(a.media).localeCompare(displayTitle(b.media)));
        html += dayColumn(dayIndex, entries, derived.tz, derived.today, 12);
      }
      el.board.innerHTML = html;
    } else {
      el.board.dataset.view = "day";
      const dayIndex = Number(state.day);
      const entries = selected.sort((a, b) => a.at - b.at || displayTitle(a.media).localeCompare(displayTitle(b.media)));
      el.board.innerHTML = dayColumn(dayIndex, entries, derived.tz, derived.today);
    }
  }
  function extraStatusLine(media) {
    if (media.status === "NOT_YET_RELEASED") {
      return media.startDate ? `Premieres ${partialDate(media.startDate)}` : "Premiere date TBA";
    }
    if (media.status === "RELEASING") {
      return "On break this week";
    }
    if (media.status === "FINISHED") {
      if (media.format === "MOVIE" || media.format === "SPECIAL" || media.episodes === 1) return "Finished";
      return media.episodes ? `Finished \xB7 ${media.episodes} eps` : "Finished";
    }
    return statusLabel(media.status);
  }
  function renderExtras() {
    if (!state.data || !state.derived) return;
    const extras = filteredExtras();
    if (!extras.length) {
      el.extras.hidden = true;
      el.extrasGrid.innerHTML = "";
      return;
    }
    extras.sort((a, b) => {
      const rank = (media) => media.status === "NOT_YET_RELEASED" ? 0 : media.status === "RELEASING" ? 1 : 2;
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
        ${cover ? `<img src="${escAttr(cover)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ""}
      </div>
      <div class="extra-info">
        <span class="extra-tag">${esc(formatLabel(media.format))} \xB7 ${esc(statusLabel(media.status))}</span>
        <h3 class="extra-title">${esc(displayTitle(media))}</h3>
        <p class="extra-meta">${esc(extraStatusLine(media))}</p>
      </div>
      <button type="button" class="star extra-star ${starred ? "is-starred" : ""}" data-star="${media.id}" aria-label="${starred ? "Remove" : "Add"} ${escAttr(displayTitle(media))} ${starred ? "from" : "to"} watchlist" aria-pressed="${starred}">
        <svg aria-hidden="true"><use href="#i-star"></use></svg>
      </button>
    </article>`;
    }).join("");
  }
  function nextMetaText(next) {
    const tz = activeTz();
    const at = next.at * 1e3;
    const isToday = dateKey(at, tz) === dateKey(Date.now(), tz);
    const when = isToday ? "Today" : `${DOW[weekdayIndex(at, tz)]} ${formatDate(at, tz)}`;
    const episode = next.ep != null ? `EP ${next.ep}` : "Premiere";
    return `${episode} \xB7 ${when} \xB7 ${formatTime(at, tz)} ${zoneLabel()}`;
  }
  function renderNext() {
    const next = findNextAiring();
    state.nextAiring = next;
    if (!next) {
      el.nextPanel.dataset.id = "";
      el.countdown.className = "countdown is-idle";
      el.countdown.textContent = "\u2014";
      el.nextTitle.textContent = "The week is wrapped";
      el.nextMeta.textContent = "Check back Monday for the next slate.";
      el.nextFootText.textContent = "All times " + zoneLabel();
      return;
    }
    el.nextPanel.dataset.id = String(next.id);
    el.nextTitle.textContent = displayTitle(next.media);
    el.nextMeta.textContent = nextMetaText(next);
    el.nextFootText.textContent = state.source === "snapshot" ? state.refreshing ? "Syncing with AniList\u2026" : "Offline snapshot" : "Live schedule";
    updateCountdown();
  }
  function updateCountdown() {
    const next = state.nextAiring;
    const countdown = el.countdown;
    if (!next) {
      countdown.className = "countdown is-idle";
      countdown.textContent = "\u2014";
      return;
    }
    const diff = next.at * 1e3 - Date.now();
    countdown.className = "countdown";
    if (diff <= 0) {
      countdown.classList.add("is-soon");
      countdown.textContent = "ON AIR";
      return;
    }
    const seconds = Math.floor(diff / 1e3);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor(seconds % 86400 / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const secs = seconds % 60;
    if (days > 0) {
      countdown.classList.add("is-long");
      countdown.textContent = `${days}d ${pad2(hours)}:${pad2(minutes)}:${pad2(secs)}`;
    } else {
      countdown.textContent = `${pad2(hours)}:${pad2(minutes)}:${pad2(secs)}`;
    }
    if (diff < 36e5) countdown.classList.add("is-soon");
  }
  function updateCardStates() {
    if (!state.data) return;
    const now = Date.now();
    const tz = activeTz();
    $$("#board .slot").forEach((slot) => {
      const stateNode = slot.querySelector(".slot-state");
      if (!stateNode) return;
      const at = Number(stateNode.dataset.at) * 1e3;
      const duration = Number(stateNode.dataset.dur) || 24;
      const info = airingState(at, duration, now);
      stateNode.textContent = info.label;
      slot.classList.toggle("is-past", info.cls === "is-past");
      slot.classList.toggle("is-live", info.cls === "is-live");
    });
    $$("#board [data-now]").forEach((node) => {
      node.textContent = `Now ${formatTime(now, tz)}`;
    });
  }
  function renderFooter() {
    const tz = activeTz();
    el.footerZone.textContent = `${tz}${state.tzMode === "jst" ? " \xB7 JST" : " \xB7 Local"}`;
    el.nextZone.textContent = zoneLabel();
    const sourceLabels = {
      live: "Live \xB7 AniList",
      cache: "Cached \xB7 AniList",
      snapshot: "Snapshot \xB7 AniList"
    };
    el.dataSource.textContent = sourceLabels[state.source] || "AniList";
    if (!state.fetchedAt) {
      el.updatedAt.textContent = "\u2014";
      return;
    }
    if (state.source === "snapshot") {
      el.updatedAt.textContent = `from ${formatDate(state.fetchedAt, tz)}`;
    } else if (state.source === "cache") {
      el.updatedAt.textContent = `saved ${timeAgo(state.fetchedAt, tz)}`;
    } else {
      el.updatedAt.textContent = `updated ${timeAgo(state.fetchedAt, tz)}`;
    }
  }
  function showNotice(message) {
    el.noticeText.textContent = message;
    el.notice.hidden = false;
  }
  function clearNotice() {
    el.notice.hidden = true;
  }
  function renderFilterOptions() {
    if (!state.data) return;
    const genres = /* @__PURE__ */ new Map();
    for (const media of state.data.media) {
      for (const genre of media.genres) genres.set(genre, (genres.get(genre) || 0) + 1);
    }
    const genreList = Array.from(genres.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (!genreList.some(([genre]) => genre === state.genre)) state.genre = "all";
    el.genre.innerHTML = '<option value="all">All genres</option>' + genreList.map(([genre]) => `<option value="${escAttr(genre)}">${esc(genre)}</option>`).join("");
    el.genre.value = state.genre;
    const formats = Array.from(new Set(state.data.media.map((media) => media.format).filter(Boolean)));
    formats.sort((a, b) => {
      const aIndex = FORMAT_ORDER.indexOf(a);
      const bIndex = FORMAT_ORDER.indexOf(b);
      const aRank = aIndex === -1 ? 99 : aIndex;
      const bRank = bIndex === -1 ? 99 : bIndex;
      return aRank - bRank || a.localeCompare(b);
    });
    if (!formats.includes(state.format)) state.format = "all";
    el.format.innerHTML = '<option value="all">All formats</option>' + formats.map((format) => `<option value="${escAttr(format)}">${esc(formatLabel(format))}</option>`).join("");
    el.format.value = state.format;
  }
  function updateWatchCount() {
    el.watchlistCount.textContent = state.watchlist.size;
  }
  function syncWatchButtons(id, starred) {
    const media = state.mediaById.get(id);
    const title = media ? displayTitle(media) : "this show";
    $$(`[data-star="${id}"]`).forEach((button) => {
      button.classList.toggle("is-starred", starred);
      button.setAttribute("aria-pressed", String(starred));
      if (button.dataset.watchLabel) {
        const label = button.querySelector("[data-label]");
        if (label) label.textContent = starred ? "In watchlist" : "Add to watchlist";
      } else {
        button.setAttribute("aria-label", `${starred ? "Remove" : "Add"} ${title} ${starred ? "from" : "to"} watchlist`);
      }
    });
  }
  function updateClearButton() {
    const active = Boolean(state.query) || state.genre !== "all" || state.format !== "all" || state.watchlistOnly || !state.seasonalOnly;
    el.clearFilters.hidden = !active;
  }

  // ../anime chart/js/modules/controller.js
  var FALLBACK = window.ANIME_FALLBACK || null;
  async function loadLive() {
    if (state.refreshing) return;
    state.refreshing = true;
    setRefreshingUI(true);
    const season = seasonOf(/* @__PURE__ */ new Date());
    try {
      const bounds = weekFetchBounds();
      const [seasonMedia, weekAirings] = await Promise.all([
        fetchSeason(season.season, season.year),
        fetchWeek(bounds.start, bounds.end)
      ]);
      if (!seasonMedia.length) throw new Error("No season data returned");
      const data = normalizePayload({
        season: season.season,
        year: season.year,
        seasonMedia,
        weekAirings
      });
      saveCache(data);
      state.source = "live";
      state.fetchedAt = Date.now();
      applyData(data, "live", Date.now());
      clearNotice();
    } catch (error) {
      console.warn("[Anime Chart] Live data unavailable:", error);
      if (!state.data && FALLBACK) {
        applyData(FALLBACK, "snapshot", Date.parse(FALLBACK.generatedAt) || Date.now());
      }
      if (state.data) {
        const snapshotDate = FALLBACK && FALLBACK.generatedAt ? formatDateFull(Date.parse(FALLBACK.generatedAt), activeTz()) : "an earlier date";
        const label = state.source === "snapshot" ? `Live data is unavailable right now \u2014 showing the bundled snapshot from ${snapshotDate}.` : `Couldn't refresh the schedule \u2014 showing data saved ${timeAgo(state.fetchedAt, activeTz())}.`;
        showNotice(label);
      } else {
        showNotice("Could not reach AniList. Check your connection and try again.");
        renderErrorState("The schedule could not be loaded. Check your connection, then try again.");
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
    el.refresh.classList.toggle("is-spinning", refreshing);
    el.refresh.disabled = refreshing;
    el.refresh.setAttribute("aria-busy", String(refreshing));
    if (state.data) renderNext();
  }
  function toggleWatch(id) {
    const starred = !state.watchlist.has(id);
    if (starred) state.watchlist.add(id);
    else state.watchlist.delete(id);
    store.set("animechart:watchlist", JSON.stringify(Array.from(state.watchlist)));
    updateWatchCount();
    syncWatchButtons(id, starred);
    if (state.watchlistOnly) {
      renderBoard();
      renderExtras();
    }
  }
  function syncTitleLangUI() {
    $$(".lang-toggle button").forEach((button) => {
      const active = button.dataset.lang === state.titleLang;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }
  function setTitleLang(lang) {
    const next = lang === "english" ? "english" : "romaji";
    if (next === state.titleLang) return;
    state.titleLang = next;
    store.set("animechart:title-lang", next);
    syncTitleLangUI();
    renderAll();
    if (el.detail.open && state.openMediaId) openDetail(state.openMediaId);
  }
  function syncPills() {
    el.seasonalToggle.classList.toggle("is-on", state.seasonalOnly);
    el.seasonalToggle.setAttribute("aria-pressed", String(state.seasonalOnly));
    el.watchlistToggle.classList.toggle("is-on", state.watchlistOnly);
    el.watchlistToggle.setAttribute("aria-pressed", String(state.watchlistOnly));
  }
  function clearFilters() {
    state.query = "";
    state.genre = "all";
    state.format = "all";
    state.watchlistOnly = false;
    state.seasonalOnly = true;
    state.day = "all";
    state.dayAuto = false;
    el.search.value = "";
    el.genre.value = "all";
    el.format.value = "all";
    store.set("animechart:seasonal", "1");
    syncPills();
    updateTabActive();
    renderAll();
  }
  function setDay(day) {
    state.day = day === "all" ? "all" : Number(day);
    state.dayAuto = false;
    updateTabActive();
    renderBoard();
  }
  function tick() {
    if (el.clockTime) {
      el.clockTime.textContent = formatClock(Date.now(), activeTz());
      el.clockZone.textContent = state.tzMode === "jst" ? "JST" : shortCity(TZ_LOCAL);
    }
    if (!state.data) return;
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
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
  }
  function bindEvents() {
    syncTitleLangUI();
    $$(".lang-toggle button").forEach((button) => {
      button.addEventListener("click", () => setTitleLang(button.dataset.lang));
    });
    $$(".tz-toggle button").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.tz === state.tzMode);
      button.setAttribute("aria-pressed", String(button.dataset.tz === state.tzMode));
      button.addEventListener("click", () => {
        if (button.dataset.tz === state.tzMode) return;
        state.tzMode = button.dataset.tz === "jst" ? "jst" : "local";
        store.set("animechart:tz", state.tzMode);
        if (state.dayAuto) state.day = weekdayIndex(Date.now(), activeTz());
        $$(".tz-toggle button").forEach((item) => {
          const active = item.dataset.tz === state.tzMode;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-pressed", String(active));
        });
        renderAll();
        tick();
      });
    });
    el.refresh.addEventListener("click", () => loadLive());
    el.noticeRetry.addEventListener("click", () => loadLive());
    let searchTimer = null;
    el.search.addEventListener("input", () => {
      state.query = el.search.value.trim();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        renderBoard();
        renderExtras();
        updateClearButton();
      }, 90);
    });
    el.search.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && el.search.value) {
        event.stopPropagation();
        el.search.value = "";
        state.query = "";
        renderBoard();
        renderExtras();
        updateClearButton();
      }
    });
    el.genre.addEventListener("change", () => {
      state.genre = el.genre.value;
      renderBoard();
      renderExtras();
      updateClearButton();
    });
    el.format.addEventListener("change", () => {
      state.format = el.format.value;
      renderBoard();
      renderExtras();
      updateClearButton();
    });
    el.seasonalToggle.addEventListener("click", () => {
      state.seasonalOnly = !state.seasonalOnly;
      store.set("animechart:seasonal", state.seasonalOnly ? "1" : "0");
      syncPills();
      renderTabs();
      renderBoard();
      renderExtras();
      renderNext();
      updateClearButton();
    });
    el.watchlistToggle.addEventListener("click", () => {
      state.watchlistOnly = !state.watchlistOnly;
      syncPills();
      renderTabs();
      renderBoard();
      renderExtras();
      updateClearButton();
    });
    el.clearFilters.addEventListener("click", clearFilters);
    el.emptyReset.addEventListener("click", () => {
      if (!state.data) loadLive();
      else clearFilters();
    });
    el.dayTabs.addEventListener("click", (event) => {
      const button = event.target.closest("[data-day]");
      if (button) setDay(button.dataset.day);
    });
    document.addEventListener("click", (event) => {
      const star = event.target.closest("[data-star]");
      if (star) {
        event.preventDefault();
        event.stopPropagation();
        toggleWatch(Number(star.dataset.star));
        return;
      }
      const more = event.target.closest("[data-more]");
      if (more) {
        event.preventDefault();
        setDay(more.dataset.more);
        const tab = el.dayTabs.querySelector(`[data-day="${state.day}"]`);
        if (tab) tab.focus({ preventScroll: true });
        const schedule = document.querySelector(".schedule");
        if (schedule) schedule.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      const opener = event.target.closest("[data-open]");
      if (opener) {
        event.preventDefault();
        openDetail(Number(opener.dataset.open));
      }
    });
    el.nextPanel.addEventListener("click", () => {
      if (state.nextAiring) openDetail(state.nextAiring.id);
    });
    el.nextPanel.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (state.nextAiring) openDetail(state.nextAiring.id);
      }
    });
    el.detailClose.addEventListener("click", closeDetail);
    el.detail.addEventListener("click", (event) => {
      if (event.target === el.detail) closeDetail();
    });
    el.detail.addEventListener("close", () => {
      state.openMediaId = null;
      document.body.classList.remove("has-dialog");
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "/" && !isTypingTarget(event.target) && !el.detail.open) {
        event.preventDefault();
        el.search.focus();
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      tick();
      if (state.data && Date.now() - state.fetchedAt > 15 * 60 * 1e3) loadLive();
    });
  }
  function init() {
    bindEvents();
    syncPills();
    if (window.matchMedia("(max-width: 860px)").matches) {
      state.day = weekdayIndex(Date.now(), activeTz());
      state.dayAuto = true;
    }
    const season = seasonOf(/* @__PURE__ */ new Date());
    const cached = readCache(season.season, season.year);
    if (cached) {
      applyData(cached.data, "cache", cached.savedAt);
    } else if (FALLBACK && FALLBACK.season === season.season && FALLBACK.seasonYear === season.year) {
      applyData(FALLBACK, "snapshot", Date.parse(FALLBACK.generatedAt) || Date.now());
    } else {
      renderLoadingState();
    }
    if (el.clockTime) {
      el.clockTime.textContent = formatClock(Date.now(), activeTz());
      el.clockZone.textContent = state.tzMode === "jst" ? "JST" : shortCity(TZ_LOCAL);
    }
    tick();
    setInterval(tick, 1e3);
    setInterval(() => {
      updateCardStates();
      renderFooter();
    }, 3e4);
    loadLive();
  }

  // ../anime chart/js/main.js
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
