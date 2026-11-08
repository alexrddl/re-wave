'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(ids.length, new Set(ids).size, 'HTML IDs must be unique');

const missingIds = [...new Set([...app.matchAll(/\$\('([^']+)'\)/g)].map((match) => match[1]))]
  .filter((id) => !ids.includes(id));
assert.deepEqual(missingIds, [], 'Every static DOM lookup in app.js must exist in index.html');

for (const tab of ['sound', 'effects', 'tools']) {
  assert.match(html, new RegExp('data-editor-tab="' + tab + '"'), 'Missing editor tab: ' + tab);
}
for (const panel of ['editorTabSound', 'editorTabEffects', 'editorTabTools']) {
  assert.match(html, new RegExp('id="' + panel + '"'), 'Missing editor panel: ' + panel);
}

for (const format of ['wav', 'mp3', 'flac']) {
  assert.match(html, new RegExp('<option value="' + format + '"'), 'Missing export format: ' + format);
}
for (const control of [
  'eqLowSlider', 'eqLowMidSlider', 'eqMidSlider', 'eqHighMidSlider', 'eqHighSlider',
  'compressorSlider', 'stereoWidthSlider', 'saturationSlider', 'tapeSlider',
  'delaySlider', 'chorusSlider', 'trimStartInput', 'trimEndInput',
  'fadeInSlider', 'fadeOutSlider', 'reverseToggle',
]) {
  assert.ok(ids.includes(control), 'Missing control: ' + control);
}

for (const feature of [
  'function buildEffectGraph',
  'function applyAdvancedGraphSettings',
  'function renderEffects',
  'function trimAndReverseBuffer',
  'function applyFades',
  'function schedulePlaybackFades',
  'function switchEditorTab',
]) {
  assert.ok(app.includes(feature), 'Missing implementation: ' + feature);
}
assert.ok(app.includes('buildEffectGraph(ctx, inputNode'), 'Live preview must use the shared effect graph');
assert.ok(app.includes('buildEffectGraph(ctx, source'), 'Offline export must use the shared effect graph');
assert.ok(app.includes('trimAndReverseBuffer(processed, track.duration, state)'), 'Export must apply trim and reverse');
assert.ok(app.includes('applyFades(effected, state.fadeIn, state.fadeOut)'), 'Export must apply fades');
assert.ok(app.includes('compressorNode: compressor'), 'Compressor node must not overwrite the compressor setting');
assert.ok(app.includes('saturationNode: saturation'), 'Saturation node must not overwrite the saturation setting');

assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length, 'CSS block braces must balance');

console.log('RE:WAVE static smoke checks: PASS');
console.log('- Unique HTML IDs and DOM references');
console.log('- Sound / Effects / Edit tabs and required controls');
console.log('- WAV / MP3 / FLAC export selectors');
console.log('- Shared realtime/offline effects graph');
console.log('- Trim / reverse / fade export path');
console.log('- Compressor and saturation setting/node separation');
console.log('- Balanced CSS blocks');
