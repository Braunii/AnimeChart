/* Entry point for the ES-module version of Anime Chart. */

import { init } from './modules/controller.js';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
