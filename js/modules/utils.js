/* Small DOM, storage and presentation utilities. */

import { TZ_JST } from './config.js';

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export const store = {
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
      /* private mode / quota */
    }
  }
};

export function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

export const escAttr = esc;

export function pad2(number) {
  return String(number).padStart(2, '0');
}

export function clamp(number, min, max) {
  return Math.min(max, Math.max(min, number));
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function safeColor(color) {
  return /^#[0-9a-f]{3,8}$/i.test(String(color || '')) ? color : '#3a4354';
}

export function assetUrl(url) {
  return typeof url === 'string' && /^https:\/\//i.test(url) ? url : '';
}

export function shortCity(tz) {
  if (tz === TZ_JST) return 'Tokyo';
  if (!tz) return 'UTC';
  return tz.split('/').pop().replace(/_/g, ' ');
}

export function cleanDescription(html) {
  if (!html) return '';
  let text = '';
  try {
    const doc = new DOMParser().parseFromString(String(html), 'text/html');
    text = doc.body ? doc.body.textContent || '' : '';
  } catch (_) {
    text = String(html).replace(/<[^>]+>/g, ' ');
  }
  text = text.replace(/\s+/g, ' ').trim();
  if (text.length > 1500) text = `${text.slice(0, 1500).replace(/\s+\S*$/, '')}…`;
  return text;
}
