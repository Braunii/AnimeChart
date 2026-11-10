/* Human-readable labels for AniList enums and dates. */

import { FORMAT_LABEL, MONTHS, STATUS_LABEL } from './config.js';

export function formatLabel(format) {
  return FORMAT_LABEL[format] || format || '—';
}

export function statusLabel(status) {
  return STATUS_LABEL[status] || '—';
}

export function episodesLabel(media) {
  if (media.episodes) return `${media.episodes} ep${media.episodes === 1 ? '' : 's'}`;
  if (media.status === 'RELEASING') return 'Ongoing';
  return '—';
}

export function partialDate(date) {
  if (!date || !date.year) return 'TBA';
  if (!date.month) return String(date.year);
  if (!date.day) return `${MONTHS[date.month - 1]} ${date.year}`;
  return `${MONTHS[date.month - 1]} ${date.day}, ${date.year}`;
}
