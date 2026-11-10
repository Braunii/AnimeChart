/* Date, time-zone and broadcast-state helpers. */

import { SEASONS, TZ_LOCAL } from './config.js';

const formatterCache = new Map();

export function formatter(tz, options) {
  const key = tz + '|' + JSON.stringify(options);
  let fmt = formatterCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: tz }, options));
    formatterCache.set(key, fmt);
  }
  return fmt;
}

export function tzParts(ms, tz) {
  const parts = formatter(tz, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date(ms));

  const out = {};
  for (const part of parts) {
    if (part.type !== 'literal') out[part.type] = Number(part.value);
  }
  return out;
}

export function tzOffsetMs(ms, tz) {
  const p = tzParts(ms, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

export function zonedToUtc(year, month, day, hour = 0, minute = 0, tz = TZ_LOCAL) {
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

export function startOfWeek(ms, tz) {
  const p = tzParts(ms, tz);
  const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay(); // 0 = Sunday
  const mondayOffset = (weekday + 6) % 7;
  return zonedToUtc(p.year, p.month - 1, p.day - mondayOffset, 0, 0, tz);
}

export function weekRange(tz) {
  const start = startOfWeek(Date.now(), tz);
  const p = tzParts(start, tz);
  const end = zonedToUtc(p.year, p.month - 1, p.day + 7, 0, 0, tz);
  return { start, end };
}

export function weekdayIndex(ms, tz) {
  const p = tzParts(ms, tz);
  return (new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay() + 6) % 7;
}

export function dateKey(ms, tz) {
  const p = tzParts(ms, tz);
  return `${p.year}-${p.month}-${p.day}`;
}

export function formatTime(ms, tz) {
  return formatter(tz, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(ms));
}

export function formatClock(ms, tz) {
  return formatter(tz, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(ms));
}

export function formatDate(ms, tz) {
  return formatter(tz, { month: 'short', day: 'numeric' }).format(new Date(ms));
}

export function formatDateFull(ms, tz) {
  return formatter(tz, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(ms));
}

export function isoWeekNumber(ms, tz) {
  const p = tzParts(ms, tz);
  const date = new Date(Date.UTC(p.year, p.month - 1, p.day));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

export function seasonOf(date) {
  const month = date.getMonth();
  return { season: SEASONS[Math.floor(month / 3)], year: date.getFullYear() };
}

export function relativeTime(diffMs) {
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `in ${Math.max(1, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest && hours < 10 ? `in ${hours}h ${rest}m` : `in ${hours}h`;
  }
  return `in ${Math.floor(hours / 24)}d`;
}

export function airingState(atMs, durationMinutes, now = Date.now()) {
  const end = atMs + (durationMinutes || 24) * 60000;
  if (now >= atMs && now < end) return { cls: 'is-live', label: 'on air' };
  if (now >= atMs) return { cls: 'is-past', label: 'aired' };
  return { cls: '', label: relativeTime(atMs - now) };
}

export function timeAgo(ms, tz = TZ_LOCAL) {
  const seconds = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (seconds < 45) return 'just now';
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return formatDate(ms, tz);
}
