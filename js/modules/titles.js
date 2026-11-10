/* Title-language selection used everywhere a title is displayed. */

import { state } from './state.js';

export function displayTitle(media) {
  const { romaji, english, native } = media.title;
  const preferred = state.titleLang === 'english' ? english : romaji;
  return preferred || romaji || english || native || 'Untitled';
}

export function altTitle(media) {
  const primary = displayTitle(media);
  const secondary = state.titleLang === 'english' ? media.title.romaji : media.title.english;
  const parts = [];

  if (secondary && secondary !== primary) parts.push(secondary);
  if (media.title.native && media.title.native !== primary && media.title.native !== secondary) {
    parts.push(media.title.native);
  }

  return parts.join(' · ');
}

export function initialFor(media) {
  const title = displayTitle(media).trim();
  return title ? title.charAt(0).toUpperCase() : 'ア';
}
