/* Shared constants and labels for Anime Chart. */

export const API_URL = 'https://graphql.anilist.co';
export const CACHE_PREFIX = 'animechart:data:v1';
export const CACHE_MAX_AGE = 24 * 60 * 60 * 1000;
export const TZ_LOCAL = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
export const TZ_JST = 'Asia/Tokyo';

export const SEASONS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
export const SEASON_LABEL = { WINTER: 'Winter', SPRING: 'Spring', SUMMER: 'Summer', FALL: 'Fall' };
export const SEASON_KICKER = { WINTER: 'Winter', SPRING: 'Spring', SUMMER: 'Summer', FALL: 'Autumn' };
export const SEASON_JP = { WINTER: '冬アニメ', SPRING: '春アニメ', SUMMER: '夏アニメ', FALL: '秋アニメ' };
export const SEASON_START_MONTH = { WINTER: 0, SPRING: 3, SUMMER: 6, FALL: 9 };

export const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DOW_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const FORMAT_LABEL = {
  TV: 'TV',
  TV_SHORT: 'TV Short',
  ONA: 'ONA',
  OVA: 'OVA',
  MOVIE: 'Film',
  SPECIAL: 'Special',
  MUSIC: 'Music'
};

export const STATUS_LABEL = {
  RELEASING: 'Airing',
  FINISHED: 'Finished',
  NOT_YET_RELEASED: 'Upcoming',
  CANCELLED: 'Cancelled',
  HIATUS: 'On hiatus'
};

export const FORMAT_ORDER = ['TV', 'ONA', 'TV_SHORT', 'OVA', 'MOVIE', 'SPECIAL'];
