import { getSetting, setSetting } from '../state.js';
import { renderHeader } from '../components/header.js';

export default function settingsView(app) {
  var bgMusic = getSetting('bgMusic', true);
  var sfx = getSetting('sfx', true);

  app.innerHTML = renderHeader('Settings', '/', [
    { label: 'Home', hash: '/' },
    { label: 'Settings' }
  ]) + '<div class="settings">'
    + '<h1 class="settings__title">Settings</h1>'
    + '<div class="settings__group">'
    + '<div class="settings__row">'
    + '<div class="settings__label">'
    + '<div class="settings__name">Background Music</div>'
    + '<div class="settings__desc">Ambient music during lessons</div>'
    + '</div>'
    + '<button class="settings__toggle' + (bgMusic ? ' settings__toggle--on' : '') + '" id="toggle-bg" role="switch" aria-checked="' + bgMusic + '">'
    + '<span class="settings__toggle-thumb"></span>'
    + '</button>'
    + '</div>'
    + '<div class="settings__row">'
    + '<div class="settings__label">'
    + '<div class="settings__name">Sound Effects</div>'
    + '<div class="settings__desc">Quiz sounds and feedback</div>'
    + '</div>'
    + '<button class="settings__toggle' + (sfx ? ' settings__toggle--on' : '') + '" id="toggle-sfx" role="switch" aria-checked="' + sfx + '">'
    + '<span class="settings__toggle-thumb"></span>'
    + '</button>'
    + '</div>'
    + '</div>'
    + '</div>';

  document.getElementById('toggle-bg').addEventListener('click', function() {
    bgMusic = !bgMusic;
    setSetting('bgMusic', bgMusic);
    this.classList.toggle('settings__toggle--on', bgMusic);
    this.setAttribute('aria-checked', bgMusic);
  });

  document.getElementById('toggle-sfx').addEventListener('click', function() {
    sfx = !sfx;
    setSetting('sfx', sfx);
    this.classList.toggle('settings__toggle--on', sfx);
    this.setAttribute('aria-checked', sfx);
  });
}
