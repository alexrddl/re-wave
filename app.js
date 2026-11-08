const $ = (id) => document.getElementById(id);

const PRESETS = {
  none:      { speed: 1.00, pitch: 1.00, reverb: 0,  bass: 0, volume: 100 },
  slowed:    { speed: 0.80, pitch: 0.80, reverb: 40, bass: 0, volume: 100 },
  nightcore: { speed: 1.20, pitch: 1.20, reverb: 0,  bass: 0, volume: 100 },
  deep:      { speed: 0.90, pitch: 0.90, reverb: 28, bass: 4, volume: 100 },
  vaporwave: { speed: 0.85, pitch: 0.85, reverb: 60, bass: 2, volume: 95 },
  chipmunk:  { speed: 1.25, pitch: 1.32, reverb: 8,  bass: 0, volume: 100 },
  dreamy:    { speed: 0.95, pitch: 0.95, reverb: 65, bass: 1, volume: 100 },
  bass:      { speed: 1.00, pitch: 1.00, reverb: 0,  bass: 6, volume: 100 },
};

const state = {
  tracks: [],
  selectedId: null,
  audioContext: null,
  soundTouchNodeClass: null,
  processOffline: null,
  processorUrl: 'https://cdn.jsdelivr.net/npm/@soundtouchjs/audio-worklet@2.1.1/.dist/soundtouch-processor.js',
  workletReady: false,
  workletFailed: false,
  usingFallback: false,
  source: null,
  stNode: null,
  eq: null,
  eqBands: null, compressorNode: null, saturationNode: null, tapeTone: null,
  widthLeft: null, widthRight: null, delayWet: null, delayFeedback: null, chorusWet: null, chorusDepth: null, fadeGain: null,
  convolver: null,
  dryGain: null,
  wetGain: null,
  masterGain: null,
  isPlaying: false,
  isLooping: false,
  offsetAtStart: 0,
  startedAt: 0,
  pausedPosition: 0,
  speed: 1,
  pitch: 1,
  activePreset: 'none',
  reverb: 0,
  bass: 0,
  volume: 100,
  eqLow: 0, eqLowMid: 0, eqMid: 0, eqHighMid: 0, eqHigh: 0,
  compressor: 0, stereoWidth: 100, saturation: 0, tape: 0, delay: 0, chorus: 0,
  trimStart: 0, trimEnd: null, fadeIn: 0, fadeOut: 0, reverse: false,
  segmentStart: 0, segmentEnd: 0, playbackReverse: false,
  reversedBuffer: null,
  effectModulators: [], effectGraphNodes: [],
  raf: null,
  toastTimer: null,
};

const mastering = {
  tracks: [],
  targetLufs: -14,
  truePeakCeiling: -1,
  busy: false,
};

const elements = {
  fileInput: $('fileInput'), addFilesButton: $('addFilesButton'), addMoreButton: $('addMoreButton'),
  clearButton: $('clearButton'), dropzone: $('dropzone'), trackList: $('trackList'), emptyQueue: $('emptyQueue'),
  trackCount: $('trackCount'), queueMeta: $('queueMeta'), currentTrackName: $('currentTrackName'),
  currentTrackInfo: $('currentTrackInfo'), playerTrackName: $('playerTrackName'), playerTrackMeta: $('playerTrackMeta'),
  playButton: $('playButton'), playIcon: $('playIcon'), previousButton: $('previousButton'), nextButton: $('nextButton'),
  loopButton: $('loopButton'), waveCanvas: $('waveCanvas'), wavePlaceholder: $('wavePlaceholder'), waveWrap: $('waveWrap'),
  currentTime: $('currentTime'), duration: $('duration'), miniProgressFill: $('miniProgressFill'),
  speedSlider: $('speedSlider'), pitchSlider: $('pitchSlider'), reverbSlider: $('reverbSlider'),
  bassSlider: $('bassSlider'), volumeSlider: $('volumeSlider'), quickVolume: $('quickVolume'),
  speedValue: $('speedValue'), pitchValue: $('pitchValue'), reverbValue: $('reverbValue'),
  bassValue: $('bassValue'), volumeValue: $('volumeValue'), downloadButton: $('downloadButton'),
  statusLine: $('statusLine'), toast: $('toast'),
  editorTabButtons: Array.from(document.querySelectorAll('[data-editor-tab]')),
  editorTabPanels: ['sound','effects','tools'].map((name) => $('editorTab' + name[0].toUpperCase() + name.slice(1))),
  eqLowSlider: $('eqLowSlider'), eqLowMidSlider: $('eqLowMidSlider'), eqMidSlider: $('eqMidSlider'), eqHighMidSlider: $('eqHighMidSlider'), eqHighSlider: $('eqHighSlider'),
  eqLowValue: $('eqLowValue'), eqLowMidValue: $('eqLowMidValue'), eqMidValue: $('eqMidValue'), eqHighMidValue: $('eqHighMidValue'), eqHighValue: $('eqHighValue'),
  eqResetButton: $('eqResetButton'),
  compressorSlider: $('compressorSlider'), compressorValue: $('compressorValue'),
  stereoWidthSlider: $('stereoWidthSlider'), stereoWidthValue: $('stereoWidthValue'),
  saturationSlider: $('saturationSlider'), saturationValue: $('saturationValue'),
  tapeSlider: $('tapeSlider'), tapeValue: $('tapeValue'),
  delaySlider: $('delaySlider'), delayValue: $('delayValue'), chorusSlider: $('chorusSlider'), chorusValue: $('chorusValue'),
  trimStartInput: $('trimStartInput'), trimEndInput: $('trimEndInput'), trimDurationValue: $('trimDurationValue'),
  fadeInSlider: $('fadeInSlider'), fadeInValue: $('fadeInValue'), fadeOutSlider: $('fadeOutSlider'), fadeOutValue: $('fadeOutValue'),
  reverseToggle: $('reverseToggle'), resetToolsButton: $('resetToolsButton'),
  exportFormat: $('exportFormat'), mp3Bitrate: $('mp3Bitrate'), mp3BitrateWrap: $('mp3BitrateWrap'),
  masterExportFormat: $('masterExportFormat'), masterMp3Bitrate: $('masterMp3Bitrate'), masterMp3BitrateWrap: $('masterMp3BitrateWrap'),
  remixView: $('remixView'), masteringView: $('masteringView'), remixActions: $('remixActions'),
  pageTitle: $('pageTitle'), pageEyebrow: $('pageEyebrow'),
  masterFileInput: $('masterFileInput'), masterDropzone: $('masterDropzone'), masterTrackList: $('masterTrackList'),
  masterEmpty: $('masterEmpty'), masterCountBadge: $('masterCountBadge'), masterClearButton: $('masterClearButton'), masterAllButton: $('masterAllButton'),
  masterProgressWrap: $('masterProgressWrap'), masterProgressText: $('masterProgressText'),
  masterProgressPercent: $('masterProgressPercent'), masterProgressFill: $('masterProgressFill'),
  masterAverageLufs: $('masterAverageLufs'), masterLoudnessSpread: $('masterLoudnessSpread'),
  masterSpreadHint: $('masterSpreadHint'), masterTrackCount: $('masterTrackCount'),
  masterAnalysisState: $('masterAnalysisState'), masterAveragePeak: $('masterAveragePeak'),
  masterTargetValue: $('masterTargetValue'), masterTargetSlider: $('masterTargetSlider'),
  masterTargetCustomValue: $('masterTargetCustomValue'), truePeakCeiling: $('truePeakCeiling'),
};

function setStatus(message, kind = '') {
  elements.statusLine.textContent = message;
  elements.statusLine.className = `status-line ${kind}`.trim();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => elements.toast.classList.remove('show'), 2600);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getSelectedTrack() {
  return state.tracks.find((track) => track.id === state.selectedId) || null;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function updateSliderFill(slider) {
  const min = Number(slider.min);
  const max = Number(slider.max);
  const val = Number(slider.value);
  const percent = ((val - min) / (max - min)) * 100;
  slider.style.setProperty('--range-fill', `${percent}%`);
}

function updateEffectLabels() {
  elements.speedValue.textContent = `${state.speed.toFixed(2)}×`;
  elements.pitchValue.textContent = `${state.pitch.toFixed(2)}×`;
  elements.reverbValue.textContent = `${state.reverb}%`;
  elements.bassValue.textContent = `${state.bass > 0 ? '+' : ''}${state.bass} dB`;
  elements.volumeValue.textContent = `${state.volume}%`;
  [elements.speedSlider, elements.pitchSlider, elements.reverbSlider, elements.bassSlider, elements.volumeSlider, elements.quickVolume].forEach(updateSliderFill);
  elements.quickVolume.value = String(state.volume);
}

function pitchRatioToSemitones(ratio) {
  return 12 * Math.log2(Math.max(0.01, ratio));
}

function updatePresetSelection() {
  document.querySelectorAll('.preset-card[data-preset]').forEach((button) => {
    const active = button.dataset.preset === state.activePreset;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function applySettings(settings, announce = true, presetKey = null) {
  const oldEffectiveRate = state.usingFallback ? state.speed * state.pitch : state.speed;
  const newEffectiveRate = state.usingFallback ? settings.speed * settings.pitch : settings.speed;
  if (state.isPlaying && Math.abs(oldEffectiveRate - newEffectiveRate) > 0.0001) {
    const position = getCurrentPosition();
    state.offsetAtStart = position;
    state.startedAt = state.audioContext.currentTime;
  }
  state.speed = settings.speed;
  state.pitch = settings.pitch;
  state.reverb = settings.reverb;
  state.bass = settings.bass;
  state.volume = settings.volume;
  state.activePreset = presetKey;
  elements.speedSlider.value = String(state.speed);
  elements.pitchSlider.value = String(state.pitch);
  elements.reverbSlider.value = String(state.reverb);
  elements.bassSlider.value = String(state.bass);
  elements.volumeSlider.value = String(state.volume);
  updateEffectLabels();
  updatePresetSelection();

  if (state.source && state.isPlaying) {
    const now = state.audioContext.currentTime;
    const effectiveRate = state.usingFallback ? state.speed * state.pitch : state.speed;
    state.source.playbackRate.setTargetAtTime(effectiveRate, now, 0.025);
    if (state.stNode) {
      state.stNode.playbackRate.setTargetAtTime(state.speed, now, 0.025);
      state.stNode.pitchSemitones.setTargetAtTime(pitchRatioToSemitones(state.pitch), now, 0.025);
    }
  }
  if (state.eq) state.eq.gain.setTargetAtTime(state.bass, state.audioContext.currentTime, 0.025);
  if (state.dryGain) state.dryGain.gain.setTargetAtTime(1 - (state.reverb / 100) * 0.24, state.audioContext.currentTime, 0.025);
  if (state.wetGain) state.wetGain.gain.setTargetAtTime((state.reverb / 100) * 0.72, state.audioContext.currentTime, 0.025);
  if (state.masterGain) state.masterGain.gain.setTargetAtTime(state.volume / 100, state.audioContext.currentTime, 0.025);
  if (state.audioContext) applyAdvancedGraphSettings(state, state, state.audioContext);
  if (announce) setStatus('Настройки обновлены. Можешь слушать или скачать результат.');
}

function renderTrackList() {
  elements.trackList.innerHTML = '';
  elements.trackCount.textContent = String(state.tracks.length);
  elements.queueMeta.textContent = `${state.tracks.length} ${state.tracks.length === 1 ? 'FILE' : 'FILES'}`;
  if (!state.tracks.length) {
    elements.trackList.appendChild(elements.emptyQueue);
    elements.emptyQueue.style.display = 'block';
    return;
  }
  state.tracks.forEach((track, index) => {
    const item = document.createElement('div');
    item.className = `track-item ${track.id === state.selectedId ? 'active' : ''}`;
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `Выбрать ${track.name}`);
    item.innerHTML = `
      <div class="track-art" aria-hidden="true">♫</div>
      <div class="track-meta"><strong title="${escapeHtml(track.name)}">${escapeHtml(track.name)}</strong><span>${formatTime(track.duration)} · ${formatBytes(track.size)}</span></div>
      <button class="track-more" type="button" aria-label="Удалить ${escapeHtml(track.name)}" title="Удалить трек">×</button>`;
    item.addEventListener('click', (event) => {
      if (event.target.closest('.track-more')) {
        event.stopPropagation();
        removeTrack(track.id);
        return;
      }
      selectTrack(track.id);
    });
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectTrack(track.id); }
    });
    elements.trackList.appendChild(item);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

async function addFiles(fileList) {
  const files = Array.from(fileList || []).filter((file) => file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(file.name));
  if (!files.length) {
    showToast('Не нашёл аудиофайлы. Выбери MP3, WAV, OGG или другой аудиоформат.');
    return;
  }
  let firstNewId = null;
  for (const file of files) {
    try {
      const data = await file.arrayBuffer();
      const context = await getAudioContext();
      const decoded = await context.decodeAudioData(data.slice(0));
      const track = { id: makeId(), name: file.name, size: file.size, buffer: decoded, duration: decoded.duration };
      state.tracks.push(track);
      if (!firstNewId) firstNewId = track.id;
    } catch (error) {
      console.error('Could not decode audio:', file.name, error);
      showToast(`Не удалось открыть файл: ${file.name}`);
    }
  }
  if (firstNewId) {
    renderTrackList();
    if (!state.selectedId) selectTrack(firstNewId);
    else renderTrackList();
    setStatus(`Добавлено файлов: ${files.length}. Обработка выполняется локально в браузере.`, 'success');
    if (state.workletFailed) showToast('DSP-модуль недоступен: pitch и независимый speed могут работать в упрощённом режиме.');
  }
}

function selectTrack(id) {
  const track = state.tracks.find((item) => item.id === id);
  if (!track) return;
  stopPlayback(true);
  state.selectedId = id;
  state.trimStart = 0;
  state.trimEnd = track.duration;
  state.fadeIn = 0;
  state.fadeOut = 0;
  state.reverse = false;
  state.pausedPosition = 0;
  state.reversedBuffer = null;
  resetAdvancedEffects();
  elements.currentTrackName.textContent = track.name;
  elements.currentTrackInfo.textContent = `${formatTime(track.duration)} · ${formatBytes(track.size)} · ${track.buffer.numberOfChannels} ch`;
  elements.playerTrackName.textContent = track.name;
  elements.playerTrackMeta.textContent = `${formatTime(track.duration)} · ${track.buffer.sampleRate.toLocaleString('ru-RU')} Hz`;
  elements.duration.textContent = formatTime(track.duration);
  elements.currentTime.textContent = formatTime(state.pausedPosition);
  elements.downloadButton.disabled = false;
  elements.wavePlaceholder.style.display = 'none';
  renderTrackList();
  drawWaveform(track.buffer, state.pausedPosition / track.duration);
  updateToolsControls();
  applySettings(PRESETS.none, false, 'none');
  setStatus('Трек готов. Выбери пресет или настрой эффекты вручную.');
}

function removeTrack(id) {
  const index = state.tracks.findIndex((track) => track.id === id);
  if (index < 0) return;
  const wasSelected = state.selectedId === id;
  if (wasSelected) stopPlayback(true);
  state.tracks.splice(index, 1);
  if (wasSelected) {
    state.selectedId = null;
    if (state.tracks.length) selectTrack(state.tracks[Math.min(index, state.tracks.length - 1)].id);
    else resetEditor();
  }
  renderTrackList();
}

function resetEditor() {
  state.selectedId = null;
  state.trimStart = 0; state.trimEnd = 0;
  state.fadeIn = 0; state.fadeOut = 0; state.reverse = false;
  state.pausedPosition = 0; state.reversedBuffer = null;
  resetAdvancedEffects();
  updateToolsControls();
  elements.currentTrackName.textContent = 'Выбери свой первый трек';
  elements.currentTrackInfo.textContent = 'Твой следующий любимый звук начинается здесь';
  elements.playerTrackName.textContent = 'Ничего не играет';
  elements.playerTrackMeta.textContent = 'Добавь аудио в очередь';
  elements.currentTime.textContent = '0:00';
  elements.duration.textContent = '0:00';
  elements.downloadButton.disabled = true;
  elements.wavePlaceholder.style.display = 'flex';
  const ctx = elements.waveCanvas.getContext('2d');
  ctx.clearRect(0, 0, elements.waveCanvas.width, elements.waveCanvas.height);
  elements.miniProgressFill.style.width = '0%';
  applySettings(PRESETS.none, false, 'none');
  updatePlayButton(false);
  renderTrackList();
  setStatus('Добавь трек, чтобы начать.');
}

function drawWaveform(buffer, progress = 0) {
  const canvas = elements.waveCanvas;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(116 * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const width = rect.width;
  const height = 116;
  ctx.clearRect(0, 0, width, height);
  if (!buffer) return;
  const data = buffer.getChannelData(0);
  const bars = Math.max(80, Math.floor(width / 3.4));
  const step = Math.max(1, Math.floor(data.length / bars));
  const barW = Math.max(1, (width / bars) * .54);
  const gap = width / bars;
  for (let i = 0; i < bars; i++) {
    let peak = 0;
    const start = i * step;
    const end = Math.min(data.length, start + step);
    for (let j = start; j < end; j += 5) peak = Math.max(peak, Math.abs(data[j]));
    const eased = Math.pow(peak, .72);
    const barH = Math.max(3, eased * 82);
    const x = i * gap + (gap - barW) / 2;
    const y = (height - barH) / 2;
    ctx.fillStyle = (i / bars) <= progress ? '#ffb35f' : 'rgba(255,187,124,.48)';
    roundRect(ctx, x, y, barW, barH, barW / 2);
  }
  if (progress > 0) {
    const x = Math.min(width - 1, width * progress);
    ctx.fillStyle = '#fff3e8';
    ctx.shadowColor = '#ffae50';
    ctx.shadowBlur = 9;
    ctx.beginPath(); ctx.arc(x, height / 2, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
  ctx.fill();
}

function getCurrentPosition() {
  const track = getSelectedTrack();
  if (!track) return 0;
  const bounds = getTrimBounds(track);
  if (state.isPlaying && state.audioContext) {
    const elapsed = Math.max(0, state.audioContext.currentTime - state.startedAt);
    const effectiveRate = state.usingFallback ? state.speed * state.pitch : state.speed;
    const raw = state.playbackReverse
      ? state.offsetAtStart - elapsed * effectiveRate
      : state.offsetAtStart + elapsed * effectiveRate;
    return Math.max(bounds.start, Math.min(bounds.end, raw));
  }
  return Math.max(bounds.start, Math.min(bounds.end, state.pausedPosition));
}

function updateProgress() {
  const track = getSelectedTrack();
  if (!track) return;
  const position = getCurrentPosition();
  const bounds = getTrimBounds(track);
  const ratio = track.duration ? position / track.duration : 0;
  elements.currentTime.textContent = formatTime(position);
  elements.miniProgressFill.style.width = `${ratio * 100}%`;
  drawWaveform(track.buffer, ratio);
  const finished = state.playbackReverse ? position <= bounds.start + .015 : position >= bounds.end - .015;
  if (state.isPlaying && finished) {
    const restartPosition = state.playbackReverse ? bounds.end : bounds.start;
    if (state.isLooping) {
      startPlayback(restartPosition);
    } else {
      const endPosition = bounds.start;
      state.pausedPosition = endPosition;
      stopPlayback(false);
      elements.currentTime.textContent = formatTime(endPosition);
      elements.miniProgressFill.style.width = `${(endPosition / track.duration) * 100}%`;
      drawWaveform(track.buffer, endPosition / track.duration);
    }
    return;
  }
  if (state.isPlaying) state.raf = requestAnimationFrame(updateProgress);
}

async function getAudioContext() {
  if (!state.audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Web Audio API не поддерживается этим браузером.');
    state.audioContext = new AudioContextClass();
  }
  if (state.audioContext.state === 'suspended') await state.audioContext.resume();
  return state.audioContext;
}

async function loadSoundTouch(ctx) {
  if (state.workletReady) return true;
  if (state.workletFailed) return false;
  try {
    const moduleUrl = 'https://cdn.jsdelivr.net/npm/@soundtouchjs/audio-worklet@2.1.1/+esm';
    const module = await import(moduleUrl);
    state.soundTouchNodeClass = module.SoundTouchNode;
    state.processOffline = module.processOffline;
    if (!state.soundTouchNodeClass || !state.processOffline) throw new Error('Не удалось получить функции SoundTouchJS.');
    await state.soundTouchNodeClass.register(ctx, state.processorUrl);
    state.workletReady = true;
    return true;
  } catch (error) {
    console.warn('SoundTouchJS could not be loaded. Using native playback fallback.', error);
    state.workletFailed = true;
    return false;
  }
}

function createImpulse(context, seconds = 2.8, decay = 2.25) {
  const length = Math.floor(context.sampleRate * seconds);
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const fade = Math.pow(1 - i / length, decay);
      data[i] = (Math.random() * 2 - 1) * fade;
    }
  }
  return impulse;
}

function makeSaturationCurve(amount = 0, tape = 0) {
  const size = 2048;
  const curve = new Float32Array(size);
  const blend = Math.max(0, Math.min(1, amount / 100 * .72 + tape / 100 * .18));
  const drive = 1 + amount / 18 + tape / 12;
  const normalization = Math.tanh(drive);
  for (let index = 0; index < size; index++) {
    const x = index * 2 / (size - 1) - 1;
    const shaped = Math.tanh(x * drive) / normalization;
    curve[index] = x * (1 - blend) + shaped * blend;
  }
  return curve;
}

function applyAdvancedGraphSettings(nodes, settings, ctx) {
  if (!nodes) return;
  const bands = [settings.eqLow, settings.eqLowMid, settings.eqMid, settings.eqHighMid, settings.eqHigh];
  nodes.eqBands?.forEach((filter, index) => { filter.gain.setTargetAtTime(bands[index], ctx.currentTime, .025); });
  const compression = settings.compressor / 100;
  if (nodes.compressorNode) {
    nodes.compressorNode.threshold.setTargetAtTime(settings.compressor ? -6 - compression * 24 : 0, ctx.currentTime, .025);
    nodes.compressorNode.ratio.setTargetAtTime(settings.compressor ? 1 + compression * 5.5 : 1, ctx.currentTime, .025);
    nodes.compressorNode.knee.setTargetAtTime(12, ctx.currentTime, .025);
  }
  if (nodes.saturationNode) nodes.saturationNode.curve = makeSaturationCurve(settings.saturation, settings.tape);
  if (nodes.tapeTone) nodes.tapeTone.gain.setTargetAtTime(-settings.tape * .028, ctx.currentTime, .025);
  if (nodes.widthLeft) nodes.widthLeft.gain.setTargetAtTime(settings.stereoWidth / 100, ctx.currentTime, .025);
  if (nodes.widthRight) nodes.widthRight.gain.setTargetAtTime(-settings.stereoWidth / 100, ctx.currentTime, .025);
  if (nodes.delayWet) nodes.delayWet.gain.setTargetAtTime(settings.delay / 100 * .34, ctx.currentTime, .025);
  if (nodes.chorusWet) nodes.chorusWet.gain.setTargetAtTime(settings.chorus / 100 * .28, ctx.currentTime, .025);
  if (nodes.chorusDepth) nodes.chorusDepth.gain.setTargetAtTime(settings.chorus / 100 * .0035, ctx.currentTime, .025);
}

function buildEffectGraph(ctx, sourceNode, channelCount = 2, settings = state) {
  const eq = ctx.createBiquadFilter();
  eq.type = 'lowshelf';
  eq.frequency.value = 120;
  eq.gain.value = settings.bass;

  const eqSpecs = [
    { type: 'lowshelf', frequency: 140, q: 0.7 },
    { type: 'peaking', frequency: 280, q: 0.85 },
    { type: 'peaking', frequency: 1100, q: 0.85 },
    { type: 'peaking', frequency: 4200, q: 0.85 },
    { type: 'highshelf', frequency: 10500, q: 0.7 },
  ];
  const eqBands = eqSpecs.map((spec, index) => {
    const filter = ctx.createBiquadFilter();
    filter.type = spec.type;
    filter.frequency.value = spec.frequency;
    filter.Q.value = spec.q;
    filter.gain.value = [settings.eqLow, settings.eqLowMid, settings.eqMid, settings.eqHighMid, settings.eqHigh][index];
    return filter;
  });

  let chain = eq;
  sourceNode.connect(eq);
  eqBands.forEach((filter) => { chain.connect(filter); chain = filter; });

  const compressor = ctx.createDynamicsCompressor();
  const saturation = ctx.createWaveShaper();
  saturation.oversample = '2x';
  saturation.curve = makeSaturationCurve(settings.saturation, settings.tape);
  const tapeTone = ctx.createBiquadFilter();
  tapeTone.type = 'highshelf';
  tapeTone.frequency.value = 10500;
  tapeTone.gain.value = -settings.tape * .028;
  chain.connect(compressor);
  compressor.connect(saturation);
  saturation.connect(tapeTone);
  chain = tapeTone;

  let widthLeft = null;
  let widthRight = null;
  let widthMerger = null;
  let widthGraphNodes = [];
  if (channelCount >= 2) {
    const splitter = ctx.createChannelSplitter(2);
    const merger = ctx.createChannelMerger(2);
    const leftMid = ctx.createGain(); leftMid.gain.value = .5;
    const rightMid = ctx.createGain(); rightMid.gain.value = .5;
    const leftSide = ctx.createGain(); leftSide.gain.value = .5;
    const rightSide = ctx.createGain(); rightSide.gain.value = -.5;
    const midBus = ctx.createGain();
    const sideBus = ctx.createGain();
    widthLeft = ctx.createGain(); widthLeft.gain.value = settings.stereoWidth / 100;
    widthRight = ctx.createGain(); widthRight.gain.value = -settings.stereoWidth / 100;
    widthGraphNodes = [splitter, merger, leftMid, rightMid, leftSide, rightSide, midBus, sideBus, widthLeft, widthRight];
    chain.connect(splitter);
    splitter.connect(leftMid, 0); splitter.connect(rightMid, 1);
    splitter.connect(leftSide, 0); splitter.connect(rightSide, 1);
    leftMid.connect(midBus); rightMid.connect(midBus);
    leftSide.connect(sideBus); rightSide.connect(sideBus);
    midBus.connect(merger, 0, 0); midBus.connect(merger, 0, 1);
    sideBus.connect(widthLeft); sideBus.connect(widthRight);
    widthLeft.connect(merger, 0, 0); widthRight.connect(merger, 0, 1);
    chain = merger;
    widthMerger = merger;
  }

  const dry = ctx.createGain();
  dry.gain.value = 1 - settings.reverb / 100 * .24;
  const convolver = ctx.createConvolver();
  convolver.buffer = createImpulse(ctx);
  const wet = ctx.createGain();
  wet.gain.value = settings.reverb / 100 * .72;
  const delay = ctx.createDelay(1.5);
  delay.delayTime.value = .28;
  const delayFeedback = ctx.createGain();
  delayFeedback.gain.value = .2;
  const delayWet = ctx.createGain();
  delayWet.gain.value = settings.delay / 100 * .34;
  const chorusDelay = ctx.createDelay(.05);
  chorusDelay.delayTime.value = .022;
  const chorusWet = ctx.createGain();
  chorusWet.gain.value = settings.chorus / 100 * .28;
  const chorusOscillator = ctx.createOscillator();
  chorusOscillator.type = 'sine';
  chorusOscillator.frequency.value = .32;
  const chorusDepth = ctx.createGain();
  chorusDepth.gain.value = settings.chorus / 100 * .0035;
  chorusOscillator.connect(chorusDepth);
  chorusDepth.connect(chorusDelay.delayTime);
  chorusOscillator.start();

  const fadeGain = ctx.createGain();
  fadeGain.gain.value = 1;
  const master = ctx.createGain();
  master.gain.value = settings.volume / 100;

  chain.connect(dry); dry.connect(fadeGain);
  chain.connect(convolver); convolver.connect(wet); wet.connect(fadeGain);
  chain.connect(delay); delay.connect(delayFeedback); delayFeedback.connect(delay);
  delay.connect(delayWet); delayWet.connect(fadeGain);
  chain.connect(chorusDelay); chorusDelay.connect(chorusWet); chorusWet.connect(fadeGain);
  fadeGain.connect(master);
  master.connect(ctx.destination);

  const nodes = {
    eq, eqBands, compressorNode: compressor, saturationNode: saturation, tapeTone, widthLeft, widthRight, widthMerger,
    dryGain: dry, wetGain: wet, convolver, delayWet, delayFeedback,
    chorusWet, chorusDepth, fadeGain, masterGain: master,
    effectModulators: [chorusOscillator],
    effectGraphNodes: [eq, ...eqBands, compressor, saturation, tapeTone, dry, convolver, wet, delay, delayFeedback, delayWet, chorusDelay, chorusWet, chorusOscillator, chorusDepth, fadeGain, master, ...widthGraphNodes],
  };
  applyAdvancedGraphSettings(nodes, settings, ctx);
  return nodes;
}

function schedulePlaybackFades(fadeGain, ctx, segmentDuration, effectiveRate, startsAtBoundary = true) {
  if (!fadeGain) return;
  const now = ctx.currentTime;
  const playbackDuration = segmentDuration / Math.max(.05, effectiveRate);
  const fadeIn = startsAtBoundary ? Math.min(state.fadeIn, playbackDuration / 2) / Math.max(.05, effectiveRate) : 0;
  const fadeOut = Math.min(state.fadeOut, playbackDuration / 2) / Math.max(.05, effectiveRate);
  fadeGain.gain.cancelScheduledValues(now);
  fadeGain.gain.setValueAtTime(fadeIn > 0 ? 0 : 1, now);
  if (fadeIn > 0) fadeGain.gain.linearRampToValueAtTime(1, now + fadeIn);
  if (fadeOut > 0) {
    const fadeStart = Math.max(now + fadeIn, now + playbackDuration - fadeOut);
    fadeGain.gain.setValueAtTime(1, fadeStart);
    fadeGain.gain.linearRampToValueAtTime(0, now + playbackDuration);
  }
}

function getTrimBounds(track = getSelectedTrack()) {
  if (!track) return { start: 0, end: 0 };
  const start = Math.max(0, Math.min(track.duration, Number(state.trimStart) || 0));
  const end = Math.max(start + .05, Math.min(track.duration, Number(state.trimEnd ?? track.duration) || track.duration));
  return { start: Math.min(start, track.duration - .05), end: Math.max(start + .05, end) };
}

function reverseAudioBuffer(buffer) {
  const reversed = new AudioBuffer({ length: buffer.length, numberOfChannels: buffer.numberOfChannels, sampleRate: buffer.sampleRate });
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const source = buffer.getChannelData(channel);
    const target = reversed.getChannelData(channel);
    for (let index = 0, end = source.length - 1; index < source.length; index++, end--) target[index] = source[end];
  }
  return reversed;
}

function getPlaybackBuffer(track) {
  if (!state.reverse) return track.buffer;
  if (!track.reversedBuffer) track.reversedBuffer = reverseAudioBuffer(track.buffer);
  return track.reversedBuffer;
}

function sliceAudioBuffer(buffer, startSeconds, endSeconds) {
  const start = Math.max(0, Math.min(buffer.length - 1, Math.floor(startSeconds * buffer.sampleRate)));
  const end = Math.max(start + 1, Math.min(buffer.length, Math.floor(endSeconds * buffer.sampleRate)));
  const output = new AudioBuffer({ length: end - start, numberOfChannels: buffer.numberOfChannels, sampleRate: buffer.sampleRate });
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    output.getChannelData(channel).set(buffer.getChannelData(channel).subarray(start, end));
  }
  return output;
}

function trimAndReverseBuffer(buffer, originalDuration, settings = state) {
  const startBound = Math.max(0, Math.min(originalDuration, settings.trimStart || 0));
  const endBound = Math.max(startBound + .05, Math.min(originalDuration, settings.trimEnd ?? originalDuration));
  const timeScale = buffer.duration / originalDuration;
  const cropped = sliceAudioBuffer(buffer, startBound * timeScale, endBound * timeScale);
  return settings.reverse ? reverseAudioBuffer(cropped) : cropped;
}

function applyFades(buffer, fadeInSeconds = 0, fadeOutSeconds = 0) {
  const output = new AudioBuffer({ length: buffer.length, numberOfChannels: buffer.numberOfChannels, sampleRate: buffer.sampleRate });
  const fadeInFrames = Math.min(Math.floor(fadeInSeconds * buffer.sampleRate), Math.floor(buffer.length / 2));
  const fadeOutFrames = Math.min(Math.floor(fadeOutSeconds * buffer.sampleRate), Math.floor(buffer.length / 2));
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const source = buffer.getChannelData(channel);
    const target = output.getChannelData(channel);
    for (let index = 0; index < buffer.length; index++) {
      let gain = 1;
      if (fadeInFrames > 0 && index < fadeInFrames) gain = Math.min(gain, index / fadeInFrames);
      const fromEnd = buffer.length - 1 - index;
      if (fadeOutFrames > 0 && fromEnd < fadeOutFrames) gain = Math.min(gain, fromEnd / fadeOutFrames);
      target[index] = source[index] * gain;
    }
  }
  return output;
}

async function startPlayback(position = state.pausedPosition) {
  const track = getSelectedTrack();
  if (!track) { showToast('Сначала добавь аудиофайл.'); return; }
  if (state.source || state.effectGraphNodes?.length) stopPlayback(false);
  try {
    const bounds = getTrimBounds(track);
    const boundary = state.reverse ? bounds.end : bounds.start;
    let startPosition = Number.isFinite(position) ? position : boundary;
    if (state.reverse) {
      if (startPosition <= bounds.start + .01) startPosition = bounds.end;
      startPosition = Math.max(bounds.start, Math.min(bounds.end, startPosition));
    } else {
      if (startPosition >= bounds.end - .01) startPosition = bounds.start;
      startPosition = Math.max(bounds.start, Math.min(bounds.end, startPosition));
    }
    const sourceOffset = state.reverse ? Math.max(0, track.duration - startPosition) : startPosition;
    const sourceDuration = state.reverse ? Math.max(.05, startPosition - bounds.start) : Math.max(.05, bounds.end - startPosition);
    const ctx = await getAudioContext();
    const hasWorklet = await loadSoundTouch(ctx);
    const source = ctx.createBufferSource();
    source.buffer = getPlaybackBuffer(track);
    source.playbackRate.value = state.speed;
    state.usingFallback = !hasWorklet;
    let inputNode = source;
    let stNode = null;
    if (hasWorklet) {
      stNode = new state.soundTouchNodeClass({ context: ctx });
      source.connect(stNode);
      stNode.playbackRate.value = state.speed;
      stNode.pitchSemitones.value = pitchRatioToSemitones(state.pitch);
      inputNode = stNode;
    } else {
      source.playbackRate.value = state.speed * state.pitch;
    }
    const graph = buildEffectGraph(ctx, inputNode, track.buffer.numberOfChannels, state);
    state.source = source;
    state.stNode = stNode;
    state.segmentStart = bounds.start;
    state.segmentEnd = bounds.end;
    state.playbackReverse = state.reverse;
    state.offsetAtStart = startPosition;
    state.startedAt = ctx.currentTime;
    state.pausedPosition = startPosition;
    state.isPlaying = true;
    Object.assign(state, graph);
    const effectiveRate = state.usingFallback ? state.speed * state.pitch : state.speed;
    schedulePlaybackFades(graph.fadeGain, ctx, sourceDuration, effectiveRate,
      state.reverse ? startPosition >= bounds.end - .01 : startPosition <= bounds.start + .01);
    source.onended = () => {
      if (state.source === source && state.isPlaying && !state.isLooping) {
        state.pausedPosition = state.segmentStart;
        state.isPlaying = false;
        state.source = null;
        state.stNode = null;
        graph.effectModulators?.forEach((oscillator) => { try { oscillator.stop(); } catch (_) {} });
        // Keep the effect tail connected briefly so reverb and delay can decay naturally.
        const graphNodes = graph.effectGraphNodes || [];
        setTimeout(() => {
          graphNodes.forEach((node) => { try { node.disconnect(); } catch (_) {} });
          if (state.effectGraphNodes === graphNodes) {
            state.effectGraphNodes = [];
            state.effectModulators = [];
            state.eq = null; state.eqBands = null; state.compressorNode = null;
            state.saturationNode = null; state.tapeTone = null; state.widthLeft = null; state.widthRight = null;
            state.dryGain = null; state.wetGain = null; state.convolver = null;
            state.delayWet = null; state.chorusWet = null; state.chorusDepth = null;
            state.fadeGain = null; state.masterGain = null;
          }
        }, 3200);
        cancelAnimationFrame(state.raf);
        updatePlayButton(false);
        elements.currentTime.textContent = formatTime(state.pausedPosition);
        elements.miniProgressFill.style.width = `${(state.pausedPosition / track.duration) * 100}%`;
        drawWaveform(track.buffer, state.pausedPosition / track.duration);
      }
    };
    source.start(0, sourceOffset, sourceDuration);
    updatePlayButton(true);
    cancelAnimationFrame(state.raf);
    state.raf = requestAnimationFrame(updateProgress);
    setStatus(!hasWorklet
      ? 'Запасной режим: Speed и Pitch связаны. Остальные эффекты доступны.'
      : 'Воспроизведение с эффектами и независимыми Speed / Pitch.', hasWorklet ? 'success' : 'error');
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Не удалось запустить воспроизведение.', 'error');
    showToast('Не удалось запустить аудио. Попробуй другой браузер.');
  }
}

function stopPlayback(keepPosition = true) {
  cancelAnimationFrame(state.raf);
  if (keepPosition && state.isPlaying) state.pausedPosition = getCurrentPosition();
  state.isPlaying = false;
  if (state.source) {
    const oldSource = state.source;
    oldSource.onended = null;
    try { oldSource.stop(); } catch (_) { /* already stopped */ }
    try { oldSource.disconnect(); } catch (_) { /* already disconnected */ }
  }
  if (state.stNode) {
    try { state.stNode.disconnect(); } catch (_) { /* already disconnected */ }
  }
  state.effectModulators?.forEach((oscillator) => { try { oscillator.stop(); } catch (_) {} });
  state.effectGraphNodes?.forEach((node) => { try { node.disconnect(); } catch (_) {} });
  state.source = null;
  state.stNode = null;
  state.effectModulators = [];
  state.effectGraphNodes = [];
  state.eq = null; state.eqBands = null; state.compressorNode = null;
  state.saturationNode = null; state.tapeTone = null; state.widthLeft = null; state.widthRight = null;
  state.dryGain = null; state.wetGain = null; state.convolver = null;
  state.delayWet = null; state.chorusWet = null; state.chorusDepth = null;
  state.fadeGain = null; state.masterGain = null;
  updatePlayButton(false);
}

function updatePlayButton(playing) {
  elements.playIcon.textContent = playing ? 'Ⅱ' : '▶';
  elements.playButton.setAttribute('aria-label', playing ? 'Пауза' : 'Воспроизвести');
  elements.playButton.title = playing ? 'Пауза' : 'Воспроизвести';
}


async function togglePlayback() {
  const track = getSelectedTrack();
  if (!track) { showToast('Сначала добавь трек в очередь.'); return; }
  if (state.isPlaying) {
    stopPlayback(true);
    setStatus('Пауза. Нажми Play, чтобы продолжить.');
  } else {
    const bounds = getTrimBounds(track);
    let position = state.pausedPosition;
    if (state.reverse ? position <= bounds.start + .01 : position >= bounds.end - .01) position = state.reverse ? bounds.end : bounds.start;
    await startPlayback(position);
  }
}


function seekTo(ratio) {
  const track = getSelectedTrack();
  if (!track) return;
  const bounds = getTrimBounds(track);
  const raw = Math.max(0, Math.min(1, ratio)) * track.duration;
  const position = Math.max(bounds.start, Math.min(bounds.end, raw));
  const wasPlaying = state.isPlaying;
  if (wasPlaying) stopPlayback(false);
  state.pausedPosition = position;
  elements.currentTime.textContent = formatTime(position);
  elements.miniProgressFill.style.width = `${(position / track.duration) * 100}%`;
  drawWaveform(track.buffer, position / track.duration);
  if (wasPlaying) startPlayback(position);
}


function changeTrack(direction) {
  if (!state.tracks.length) return;
  const index = state.tracks.findIndex((track) => track.id === state.selectedId);
  const next = (index + direction + state.tracks.length) % state.tracks.length;
  selectTrack(state.tracks[next].id);
  const nextTrack = getSelectedTrack();
  startPlayback(state.reverse ? nextTrack.duration : 0);
}


function drawProgressAfterResize() {
  const track = getSelectedTrack();
  if (track) drawWaveform(track.buffer, getCurrentPosition() / track.duration);
}

let mp3EncoderPromise = null;

async function ensureMp3Encoder() {
  if (window.lamejs?.Mp3Encoder) return window.lamejs;
  if (!mp3EncoderPromise) {
    mp3EncoderPromise = (async () => {
      const sources = [
        'https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js',
        'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js',
      ];
      let lastError = null;
      for (const src of sources) {
        try {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.dataset.mp3Encoder = 'true';
            script.onload = () => window.lamejs?.Mp3Encoder ? resolve() : reject(new Error('LAME загрузился, но Mp3Encoder не найден.'));
            script.onerror = () => { script.remove(); reject(new Error('Не удалось загрузить MP3-кодировщик.')); };
            document.head.appendChild(script);
          });
          return window.lamejs;
        } catch (error) { lastError = error; }
      }
      throw lastError || new Error('MP3-кодировщик недоступен. Проверь подключение к интернету.');
    })().catch((error) => { mp3EncoderPromise = null; throw error; });
  }
  return mp3EncoderPromise;
}

function nearestMp3SampleRate(sampleRate) {
  const supported = [8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000];
  return supported.reduce((best, candidate) => Math.abs(candidate - sampleRate) < Math.abs(best - sampleRate) ? candidate : best, supported[0]);
}

async function prepareMp3Buffer(buffer) {
  const supportedRates = [8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000];
  const outputChannels = Math.min(2, buffer.numberOfChannels);
  const outputRate = supportedRates.includes(buffer.sampleRate) ? buffer.sampleRate : nearestMp3SampleRate(buffer.sampleRate);
  if (outputChannels === buffer.numberOfChannels && outputRate === buffer.sampleRate) return buffer;
  const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OfflineContext) throw new Error('Для подготовки MP3 требуется OfflineAudioContext.');
  const frames = Math.max(1, Math.ceil(buffer.duration * outputRate));
  const context = new OfflineContext(outputChannels, frames, outputRate);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.start(0);
  return context.startRendering();
}

function floatToPcm16(value) {
  const sample = Math.max(-1, Math.min(1, value));
  return sample < 0 ? Math.round(sample * 32768) : Math.round(sample * 32767);
}

async function encodeMp3(buffer, bitrate = 320, onProgress = null) {
  const library = await ensureMp3Encoder();
  const prepared = await prepareMp3Buffer(buffer);
  const channels = prepared.numberOfChannels;
  if (channels !== 1 && channels !== 2) throw new Error('MP3 экспорт поддерживает mono или stereo.');
  const encoder = new library.Mp3Encoder(channels, prepared.sampleRate, Number(bitrate));
  const channelData = Array.from({ length: channels }, (_, index) => prepared.getChannelData(index));
  const blockSize = 1152;
  const outputChunks = [];
  const totalFrames = prepared.length;
  for (let offset = 0; offset < totalFrames; offset += blockSize) {
    const size = Math.min(blockSize, totalFrames - offset);
    const left = new Int16Array(size);
    const right = channels === 2 ? new Int16Array(size) : null;
    for (let index = 0; index < size; index++) {
      left[index] = floatToPcm16(channelData[0][offset + index]);
      if (right) right[index] = floatToPcm16(channelData[1][offset + index]);
    }
    const encoded = channels === 2 ? encoder.encodeBuffer(left, right) : encoder.encodeBuffer(left);
    if (encoded?.length) outputChunks.push(new Uint8Array(encoded));
    if (onProgress && (offset === 0 || offset % (blockSize * 96) === 0 || offset + size >= totalFrames)) {
      onProgress(totalFrames ? Math.min(100, ((offset + size) / totalFrames) * 100) : 100);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  const tail = encoder.flush();
  if (tail?.length) outputChunks.push(new Uint8Array(tail));
  if (!outputChunks.length) throw new Error('MP3-кодировщик вернул пустой файл.');
  return new Blob(outputChunks, { type: 'audio/mpeg' });
}

let flacEncoderPromise = null;

async function ensureFlacEncoder() {
  if (!flacEncoderPromise) {
    flacEncoderPromise = import('https://esm.sh/@audio/encode-flac@1.4.3?bundle')
      .then((module) => {
        const factory = module.default || module.flac || module;
        if (typeof factory !== 'function') throw new Error('FLAC-кодировщик загрузился в неизвестном формате.');
        return factory;
      })
      .catch((error) => {
        flacEncoderPromise = null;
        throw new Error('Не удалось загрузить FLAC-кодировщик. Проверь подключение к интернету и попробуй ещё раз.');
      });
  }
  return flacEncoderPromise;
}

async function encodeFlac(buffer, onProgress = null) {
  const createEncoder = await ensureFlacEncoder();
  const prepared = await prepareMp3Buffer(buffer);
  const channels = prepared.numberOfChannels;
  if (channels !== 1 && channels !== 2) throw new Error('FLAC экспорт поддерживает mono или stereo.');
  const encoder = await createEncoder({
    sampleRate: prepared.sampleRate,
    channels,
    bitDepth: 24,
    compression: 5,
    frames: prepared.length,
  });
  const sourceChannels = Array.from({ length: channels }, (_, index) => prepared.getChannelData(index));
  const chunkSize = 16384;
  const chunks = [];
  let totalBytes = 0;
  try {
    for (let offset = 0; offset < prepared.length; offset += chunkSize) {
      const end = Math.min(prepared.length, offset + chunkSize);
      const pcmChannels = sourceChannels.map((channel) => channel.subarray(offset, end));
      const encoded = await encoder.encode(pcmChannels);
      if (encoded?.length) { chunks.push(new Uint8Array(encoded)); totalBytes += encoded.length; }
      if (onProgress) {
        onProgress(prepared.length ? Math.min(99, (end / prepared.length) * 100) : 99);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    const tail = await encoder.flush();
    if (tail?.length) { chunks.push(new Uint8Array(tail)); totalBytes += tail.length; }
    const finalHeader = typeof encoder.head === 'function' ? await encoder.head() : null;
    if (!totalBytes) throw new Error('FLAC-кодировщик вернул пустой файл.');
    const output = new Uint8Array(totalBytes);
    let cursor = 0;
    for (const chunk of chunks) { output.set(chunk, cursor); cursor += chunk.length; }
    // libFLAC finalizes STREAMINFO only after flush; replace the provisional header.
    if (finalHeader?.length) output.set(new Uint8Array(finalHeader).subarray(0, Math.min(finalHeader.length, output.length)), 0);
    if (onProgress) onProgress(100);
    if (output[0] !== 0x66 || output[1] !== 0x4c || output[2] !== 0x61 || output[3] !== 0x43) {
      throw new Error('FLAC-кодировщик сформировал некорректный заголовок файла.');
    }
    return new Blob([output], { type: 'audio/flac' });
  } finally {
    if (typeof encoder.free === 'function') encoder.free();
  }
}

function selectedFormat(selectElement) { return ['wav', 'mp3', 'flac'].includes(selectElement?.value) ? selectElement.value : 'wav'; }
function selectedBitrate(selectElement) {
  const value = Number(selectElement?.value || 320);
  return [128, 192, 256, 320].includes(value) ? value : 320;
}

function updateExportFormatControls() {
  const remixFormat = selectedFormat(elements.exportFormat);
  const masterFormat = selectedFormat(elements.masterExportFormat);
  elements.mp3BitrateWrap.hidden = remixFormat !== 'mp3';
  elements.downloadButton.querySelector('span').textContent = 'Скачать ' + remixFormat.toUpperCase();
  elements.masterMp3BitrateWrap.hidden = masterFormat !== 'mp3';
}
function encodeWav(buffer, bitDepth = 16) {
  if (![16, 24].includes(bitDepth)) throw new Error('Поддерживается экспорт WAV 16-bit или 24-bit.');
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const frames = buffer.length;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = channels * bytesPerSample;
  const dataSize = frames * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);
  const writeString = (offset, text) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
  writeString(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); writeString(8, 'WAVE');
  writeString(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, channels, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true); writeString(36, 'data'); view.setUint32(40, dataSize, true);
  const channelData = Array.from({ length: channels }, (_, i) => buffer.getChannelData(i));
  let offset = 44;
  for (let frame = 0; frame < frames; frame++) {
    for (let channel = 0; channel < channels; channel++) {
      let sample = Math.max(-1, Math.min(1, channelData[channel][frame]));
      if (bitDepth === 16) {
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      } else {
        // TPDF dither at the 24-bit quantization step.
        sample = Math.max(-1, Math.min(1, sample + (Math.random() - Math.random()) / 0x800000));
        let value = Math.round(sample < 0 ? sample * 0x800000 : sample * 0x7fffff);
        if (value < 0) value += 0x1000000;
        view.setUint8(offset, value & 0xff);
        view.setUint8(offset + 1, (value >> 8) & 0xff);
        view.setUint8(offset + 2, (value >> 16) & 0xff);
      }
      offset += bytesPerSample;
    }
  }
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

async function renderEffects(inputBuffer, settings) {
  const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OfflineContext) throw new Error('OfflineAudioContext не поддерживается этим браузером.');
  const effectTail = Math.max(settings.reverb > 0 ? 2.8 : 0, settings.delay > 0 ? 1.8 : 0);
  const length = inputBuffer.length + Math.ceil(inputBuffer.sampleRate * effectTail);
  const ctx = new OfflineContext(inputBuffer.numberOfChannels, length, inputBuffer.sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = inputBuffer;
  buildEffectGraph(ctx, source, inputBuffer.numberOfChannels, settings);
  source.start(0);
  return ctx.startRendering();
}


function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

async function exportTrack() {
  const track = getSelectedTrack();
  if (!track) return;
  const button = elements.downloadButton;
  const buttonLabel = button.querySelector('span');
  button.disabled = true;
  buttonLabel.textContent = 'Обработка…';
  setStatus('Готовлю аудио для экспорта. Не закрывай вкладку…');
  try {
    let processed = track.buffer;
    if ((Math.abs(state.speed - 1) > .001 || Math.abs(state.pitch - 1) > .001) && !state.processOffline && !state.workletFailed) {
      const context = await getAudioContext();
      await loadSoundTouch(context);
    }
    if (Math.abs(state.speed - 1) > .001 || Math.abs(state.pitch - 1) > .001) {
      if (state.processOffline && !state.workletFailed) {
        setStatus('Изменяю темп и высоту тона…');
        processed = await state.processOffline({
          input: track.buffer,
          processorUrl: state.processorUrl,
          pitchSemitones: pitchRatioToSemitones(state.pitch),
          playbackRate: state.speed,
          stretchParameters: { overlapMs: 12 },
        });
      } else {
        setStatus('Применяю запасной режим изменения скорости и тона…');
        const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        const rate = state.speed * state.pitch;
        const outLength = Math.ceil(track.buffer.length / rate);
        const ctx = new OfflineContext(track.buffer.numberOfChannels, outLength, track.buffer.sampleRate);
        const source = ctx.createBufferSource(); source.buffer = track.buffer; source.playbackRate.value = rate; source.connect(ctx.destination); source.start(0);
        processed = await ctx.startRendering();
      }
    }
    setStatus('Применяю монтаж: Trim, Reverse и Fade…');
    const edited = trimAndReverseBuffer(processed, track.duration, state);
    setStatus('Применяю EQ, компрессию и пространственные эффекты…');
    const effected = await renderEffects(edited, state);
    const rendered = applyFades(effected, state.fadeIn, state.fadeOut);
    const format = selectedFormat(elements.exportFormat);
    const bitrate = selectedBitrate(elements.mp3Bitrate);
    let output;
    if (format === 'mp3') {
      setStatus(`Кодирую MP3 · ${bitrate} kbps…`);
      output = await encodeMp3(rendered, bitrate, (percent) => setStatus(`Кодирую MP3… ${Math.round(percent)}%`));
    } else if (format === 'flac') {
      setStatus('Кодирую FLAC без потерь…');
      output = await encodeFlac(rendered, (percent) => setStatus(`Кодирую FLAC… ${Math.round(percent)}%`));
    } else {
      setStatus('Создаю WAV-файл…');
      output = encodeWav(rendered);
    }
    const cleanBase = track.name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '_');
    downloadBlob(output, `${cleanBase}-rewave.${format}`);
    setStatus(`Готово! Обработанный ${format.toUpperCase()} скачан.`, 'success');
    showToast(`Ремикс готов — ${format.toUpperCase()}-файл скачан ✨`);
  } catch (error) {
    console.error('Export failed:', error);
    setStatus(error.message || 'Не удалось экспортировать файл.', 'error');
    showToast(error.message || 'Ошибка экспорта. Проверь настройки и попробуй снова.');
  } finally {
    button.disabled = !getSelectedTrack();
    buttonLabel.textContent = 'Скачать ' + selectedFormat(elements.exportFormat).toUpperCase();
  }
}

function switchView(view) {
  // Normalize the queue shortcut to the editor view, but keep its scroll behavior.
  const requestedView = view;
  const showMastering = view === 'mastering';
  const activeView = showMastering ? 'mastering' : (view === 'queue' ? 'queue' : 'remix');

  elements.remixView.hidden = showMastering;
  elements.masteringView.hidden = !showMastering;
  elements.remixActions.hidden = showMastering;
  document.body.classList.toggle('mastering-active', showMastering);

  elements.pageEyebrow.textContent = showMastering ? 'ALBUM LOUDNESS WORKSPACE' : 'YOUR PERSONAL AUDIO LAB';
  elements.pageTitle.innerHTML = showMastering
    ? 'Album mastering<span class="title-dot">.</span>'
    : 'Remix studio<span class="title-dot">.</span>';

  document.querySelectorAll('[data-view]').forEach((link) => {
    const active = link.dataset.view === activeView ||
      (activeView === 'queue' && link.dataset.view === 'queue');
    link.classList.toggle('active', active);
    if (link.matches('a.nav-link')) {
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  });

  if (showMastering) {
    renderMasterStats();
    // Keep the URL in sync so the mastering view is directly linkable/refreshable.
    if (location.hash !== '#mastering') history.replaceState(null, '', '#mastering');
  } else if (requestedView === 'queue') {
    if (location.hash !== '#library') history.replaceState(null, '', '#library');
    $('library').scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  } else if (location.hash !== '#editor') {
    history.replaceState(null, '', '#editor');
  }
}

function initializeViewFromLocation() {
  const initialHash = location.hash.toLowerCase();
  switchView(initialHash === '#mastering' ? 'mastering' : initialHash === '#library' ? 'queue' : 'remix');
}

function setMasterControlsDisabled(disabled) {
  elements.masterDropzone.disabled = disabled;
  elements.masterFileInput.disabled = disabled;
  elements.masterTargetSlider.disabled = disabled;
  elements.truePeakCeiling.disabled = disabled;
  elements.masterExportFormat.disabled = disabled;
  elements.masterMp3Bitrate.disabled = disabled;
  document.querySelectorAll('.target-preset').forEach((button) => { button.disabled = disabled; });
}

function setMasterProgress(percent, message) {
  const safePercent = Math.max(0, Math.min(100, percent));
  elements.masterProgressWrap.hidden = false;
  elements.masterProgressText.textContent = message;
  elements.masterProgressPercent.textContent = `${Math.round(safePercent)}%`;
  elements.masterProgressFill.style.width = `${safePercent}%`;
}

function hideMasterProgress() {
  elements.masterProgressWrap.hidden = true;
  elements.masterProgressFill.style.width = '0%';
}

function masterDbToGain(db) { return Math.pow(10, db / 20); }
function masterGainToDb(gain) { return 20 * Math.log10(Math.max(1e-12, gain)); }
function formatLufs(value) { return Number.isFinite(value) ? `${value < 0 ? '−' : '+'}${Math.abs(value).toFixed(1)} LUFS` : '—'; }
function formatDbtp(value) { return Number.isFinite(value) ? `${value < 0 ? '−' : '+'}${Math.abs(value).toFixed(1)} dBTP` : '—'; }
function cleanAudioName(name) { return String(name).replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '_').trim() || 'audio'; }

function loudnessChannelWeights(channelCount) {
  if (channelCount === 1) return [1];
  if (channelCount === 2) return [1, 1];
  if (channelCount === 3) return [1, 1, 1];
  if (channelCount === 4) return [1, 1, 1.41, 1.41];
  if (channelCount === 5) return [1, 1, 1, 1.41, 1.41];
  if (channelCount === 6) return [1, 1, 1, 0, 1.41, 1.41];
  return Array.from({ length: channelCount }, (_, index) => index === 3 ? 0 : (index >= 4 ? 1.41 : 1));
}

async function analyzeIntegratedLufs(inputBuffer) {
  const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OfflineContext) throw new Error('Браузер не поддерживает OfflineAudioContext. Используй актуальный Chrome или Edge.');
  if (!inputBuffer || !inputBuffer.length) return null;
  const frames = inputBuffer.length;
  const context = new OfflineContext(inputBuffer.numberOfChannels, frames, inputBuffer.sampleRate);
  const source = context.createBufferSource();
  source.buffer = inputBuffer;
  const highPass = context.createBiquadFilter();
  highPass.type = 'highpass';
  highPass.frequency.value = 38.135;
  highPass.Q.value = 0.5003;
  const highShelf = context.createBiquadFilter();
  highShelf.type = 'highshelf';
  highShelf.frequency.value = 1681.974;
  highShelf.Q.value = 0.707;
  highShelf.gain.value = 4.0;
  source.connect(highPass);
  highPass.connect(highShelf);
  highShelf.connect(context.destination);
  source.start(0);
  const filtered = await context.startRendering();
  const channels = Array.from({ length: filtered.numberOfChannels }, (_, channel) => filtered.getChannelData(channel));
  const weights = loudnessChannelWeights(filtered.numberOfChannels);
  const blockLength = Math.max(1, Math.min(frames, Math.round(filtered.sampleRate * 0.4)));
  const hopLength = Math.max(1, Math.round(filtered.sampleRate * 0.1));

  const frameEnergy = (frame) => {
    let total = 0;
    for (let channel = 0; channel < channels.length; channel++) {
      const sample = channels[channel][frame];
      total += sample * sample * weights[channel];
    }
    return total;
  };
  let rollingEnergy = 0;
  for (let frame = 0; frame < blockLength; frame++) rollingEnergy += frameEnergy(frame);
  const blockEnergies = [];
  for (let start = 0; start + blockLength <= frames; start += hopLength) {
    blockEnergies.push(rollingEnergy / blockLength);
    const nextStart = start + hopLength;
    if (nextStart + blockLength > frames) break;
    const removeEnd = Math.min(frames, nextStart);
    for (let frame = start; frame < removeEnd; frame++) rollingEnergy -= frameEnergy(frame);
    const addStart = start + blockLength;
    const addEnd = Math.min(frames, nextStart + blockLength);
    for (let frame = addStart; frame < addEnd; frame++) rollingEnergy += frameEnergy(frame);
  }
  if (!blockEnergies.length) return null;
  const toLufs = (energy) => energy > 0 ? -0.691 + 10 * Math.log10(energy) : -Infinity;
  const absoluteGate = -70;
  const absoluteBlocks = blockEnergies.filter((energy) => toLufs(energy) >= absoluteGate);
  if (!absoluteBlocks.length) return null;
  const preliminaryEnergy = absoluteBlocks.reduce((sum, value) => sum + value, 0) / absoluteBlocks.length;
  const relativeGate = toLufs(preliminaryEnergy) - 10;
  const gatedBlocks = absoluteBlocks.filter((energy) => toLufs(energy) >= Math.max(absoluteGate, relativeGate));
  if (!gatedBlocks.length) return null;
  const integratedEnergy = gatedBlocks.reduce((sum, value) => sum + value, 0) / gatedBlocks.length;
  return toLufs(integratedEnergy);
}

async function measureApproxTruePeak(buffer, onProgress = null) {
  let peak = 0;
  const chunkSize = 262144;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let chunkStart = 0; chunkStart < data.length; chunkStart += chunkSize) {
      const chunkEnd = Math.min(data.length, chunkStart + chunkSize);
      for (let index = chunkStart; index < chunkEnd; index++) {
        const current = data[index];
        peak = Math.max(peak, Math.abs(current));
        if (index === 0 || index >= data.length - 2) continue;
        const y0 = data[index - 1], y1 = current, y2 = data[index + 1], y3 = data[index + 2];
        const a = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3;
        const b = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
        const c = -0.5 * y0 + 0.5 * y2;
        for (let phase = 1; phase < 4; phase++) {
          const t = phase * 0.25;
          peak = Math.max(peak, Math.abs(((a * t + b) * t + c) * t + y1));
        }
      }
      if (onProgress) onProgress(((channel * data.length + chunkEnd) / (buffer.numberOfChannels * data.length)) * 100);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  return masterGainToDb(peak);
}

function calculateMasterStats() {
  const analyzed = mastering.tracks.filter((track) => Number.isFinite(track.lufs) && Number.isFinite(track.truePeak));
  if (!analyzed.length) return null;
  const meanEnergy = analyzed.reduce((sum, track) => sum + Math.pow(10, (track.lufs + 0.691) / 10), 0) / analyzed.length;
  const averageLufs = -0.691 + 10 * Math.log10(meanEnergy);
  const loudnessValues = analyzed.map((track) => track.lufs);
  const peakEnergy = analyzed.reduce((sum, track) => sum + Math.pow(10, track.truePeak / 10), 0) / analyzed.length;
  return {
    count: analyzed.length,
    averageLufs,
    spread: Math.max(...loudnessValues) - Math.min(...loudnessValues),
    averagePeak: 10 * Math.log10(Math.max(1e-12, peakEnergy)),
    min: Math.min(...loudnessValues),
    max: Math.max(...loudnessValues),
  };
}

function renderMasterStats() {
  const stats = calculateMasterStats();
  const analyzedCount = stats?.count || 0;
  elements.masterAverageLufs.textContent = stats ? formatLufs(stats.averageLufs) : '—';
  elements.masterLoudnessSpread.textContent = stats ? `${stats.spread.toFixed(1)} LU` : '—';
  elements.masterSpreadHint.textContent = stats ? `От ${stats.min.toFixed(1)} до ${stats.max.toFixed(1)} LUFS` : 'Разница между самым тихим и громким';
  elements.masterTrackCount.textContent = `${mastering.tracks.length} / 20`;
  elements.masterAnalysisState.textContent = mastering.busy ? 'Идёт обработка…' : `${analyzedCount} проанализировано`;
  elements.masterAveragePeak.textContent = stats ? formatDbtp(stats.averagePeak) : '—';
  elements.masterCountBadge.textContent = String(mastering.tracks.length);
  elements.masterClearButton.disabled = !mastering.tracks.length || mastering.busy;
  elements.masterAllButton.disabled = !mastering.tracks.some((track) => Number.isFinite(track.lufs)) || mastering.busy;
}

function renderMasterTrackList() {
  const hasTracks = mastering.tracks.length > 0;
  elements.masterEmpty.hidden = hasTracks;
  elements.masterTrackList.hidden = !hasTracks;
  elements.masterTrackList.innerHTML = '';
  elements.masterCountBadge.textContent = String(mastering.tracks.length);
  mastering.tracks.forEach((track) => {
    const row = document.createElement('div');
    row.className = 'master-track-row';
    row.title = track.error || '';
    const pending = track.status === 'analyzing';
    const failed = track.status === 'error';
    const gainDb = Number.isFinite(track.lufs) ? mastering.targetLufs - track.lufs : 0;
    const wouldLimit = Number.isFinite(track.truePeak) && track.truePeak + gainDb > mastering.truePeakCeiling + 0.05;
    const resultLabel = Number.isFinite(track.masteredLufs)
      ? formatLufs(track.masteredLufs)
      : Number.isFinite(track.lufs) ? (wouldLimit ? 'Пик-контроль' : formatLufs(mastering.targetLufs)) : '—';
    const resultClass = wouldLimit || (Number.isFinite(track.masteredLufs) && track.masteredLufs < mastering.targetLufs - 0.4) ? 'limited' : '';
    const gainLabel = Number.isFinite(track.lufs) ? `${gainDb >= 0 ? '+' : '−'}${Math.abs(gainDb).toFixed(1)} dB к исходнику` : '';
    row.innerHTML = `
      <div class="master-track-name"><span class="master-track-icon">♫</span><div><strong title="${escapeHtml(track.name)}">${escapeHtml(track.name)}</strong><small>${formatTime(track.duration)} · ${formatBytes(track.size)}${pending ? ' · анализ…' : failed ? ' · ошибка' : ''}</small></div></div>
      <div class="master-metric"><span>INTEGRATED</span><strong>${Number.isFinite(track.lufs) ? formatLufs(track.lufs) : (pending ? '…' : failed ? 'Ошибка' : '—')}</strong></div>
      <div class="master-metric"><span>TRUE PEAK</span><strong class="${Number.isFinite(track.truePeak) && track.truePeak > -1 ? 'peak-hot' : ''}">${formatDbtp(track.truePeak)}</strong></div>
      <div class="master-metric"><span>ПОСЛЕ МАСТЕРИНГА</span><strong class="master-projected ${resultClass}">${resultLabel}</strong><small>${Number.isFinite(track.masteredLufs) ? formatDbtp(track.masteredPeak) : gainLabel}</small></div>
      <div class="master-row-actions"><button class="master-download" type="button" data-master-download="${track.id}" ${!Number.isFinite(track.lufs) || mastering.busy ? 'disabled' : ''}>Скачать master</button><button class="master-remove" type="button" data-master-remove="${track.id}" aria-label="Удалить трек" ${mastering.busy ? 'disabled' : ''}>×</button></div>`;
    elements.masterTrackList.appendChild(row);
  });
  renderMasterStats();
}

async function addMasterFiles(fileList) {
  if (mastering.busy) return;
  const incoming = Array.from(fileList || []).filter((file) => file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(file.name));
  if (!incoming.length) { showToast('Выбери аудиофайлы для мастеринга.'); return; }
  const available = Math.max(0, 20 - mastering.tracks.length);
  const accepted = incoming.slice(0, available);
  if (incoming.length > available) showToast(`Лимит — 20 треков. Добавлено ${accepted.length} из ${incoming.length}.`);
  if (!accepted.length) { showToast('Уже добавлено 20 треков. Удали часть, чтобы добавить новые.'); return; }
  mastering.busy = true;
  setMasterControlsDisabled(true);
  renderMasterTrackList();
  setMasterProgress(0, 'Подготовка файлов…');
  try {
    const ctx = await getAudioContext();
    for (let index = 0; index < accepted.length; index++) {
      const file = accepted[index];
      setMasterProgress((index / accepted.length) * 100, `Читаю файл ${index + 1} из ${accepted.length}: ${file.name}`);
      try {
        const data = await file.arrayBuffer();
        let buffer = await ctx.decodeAudioData(data.slice(0));
        const item = {
          id: makeId(), name: file.name, size: file.size, duration: buffer.duration,
          file, lufs: null, truePeak: null, masteredLufs: null, masteredPeak: null,
          status: 'analyzing', error: null,
        };
        mastering.tracks.push(item);
        renderMasterTrackList();
        setMasterProgress(((index + 0.15) / accepted.length) * 100, `Анализирую ${index + 1} из ${accepted.length}: ${file.name}`);
        try {
          [item.lufs, item.truePeak] = await Promise.all([
            analyzeIntegratedLufs(buffer),
            measureApproxTruePeak(buffer),
          ]);
          if (!Number.isFinite(item.lufs)) throw new Error('Слишком тихий файл или цифровая тишина.');
          item.status = 'ready';
        } catch (error) {
          item.status = 'error';
          item.error = error.message || 'Не удалось измерить громкость.';
          console.error('Loudness analysis failed:', file.name, error);
        }
        renderMasterTrackList();
        setMasterProgress(((index + 1) / accepted.length) * 100, `Проанализировано ${index + 1} из ${accepted.length}`);
        // Keep the compressed File, not a decoded multi-minute PCM buffer. This keeps 20-track albums memory-friendly.
        // The file is decoded again only when its mastered WAV is exported.
        buffer = null;
        await new Promise((resolve) => setTimeout(resolve, 0));
      } catch (error) {
        console.error('Could not decode mastering file:', file.name, error);
        showToast(`Не удалось открыть: ${file.name}`);
      }
    }
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Не удалось запустить аудиоанализ.');
  } finally {
    mastering.busy = false;
    setMasterControlsDisabled(false);
    hideMasterProgress();
    renderMasterTrackList();
    showToast('Анализ альбома завершён.');
  }
}

function updateMasterTarget(value) {
  mastering.targetLufs = Math.max(-20, Math.min(-6, Number(value)));
  const label = `${mastering.targetLufs < 0 ? '−' : '+'}${Math.abs(mastering.targetLufs).toFixed(1)} LUFS`;
  elements.masterTargetValue.textContent = label;
  elements.masterTargetCustomValue.textContent = label;
  elements.masterTargetSlider.value = String(mastering.targetLufs);
  document.querySelectorAll('.target-preset').forEach((button) => {
    button.classList.toggle('active', Math.abs(Number(button.dataset.target) - mastering.targetLufs) < 0.001);
  });
  updateSliderFill(elements.masterTargetSlider);
  mastering.tracks.forEach((track) => { track.masteredLufs = null; track.masteredPeak = null; });
  renderMasterTrackList();
}

async function createLimitedMaster(inputBuffer, inputLufs, targetLufs, ceilingDb, onProgress = null) {
  const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const channels = inputBuffer.numberOfChannels;
  const frames = inputBuffer.length;
  const sampleRate = inputBuffer.sampleRate;
  const context = new OfflineContext(channels, frames, sampleRate);
  const output = context.createBuffer(channels, frames, sampleRate);
  const inputChannels = Array.from({ length: channels }, (_, channel) => inputBuffer.getChannelData(channel));
  const outputChannels = Array.from({ length: channels }, (_, channel) => output.getChannelData(channel));
  const framePeaks = new Float32Array(frames);
  const chunkSize = 262144;
  for (let chunkStart = 0; chunkStart < frames; chunkStart += chunkSize) {
    const chunkEnd = Math.min(frames, chunkStart + chunkSize);
    for (let frame = chunkStart; frame < chunkEnd; frame++) {
      let peak = 0;
      for (let channel = 0; channel < channels; channel++) peak = Math.max(peak, Math.abs(inputChannels[channel][frame]));
      framePeaks[frame] = peak;
    }
    if (onProgress) onProgress(5 + (chunkEnd / frames) * 15);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const staticGain = masterDbToGain(targetLufs - inputLufs);
  const ceilingLinear = masterDbToGain(ceilingDb);
  const lookAhead = Math.max(1, Math.round(sampleRate * 0.005));
  const releaseSeconds = 0.08;
  const releaseCoefficient = Math.exp(-1 / (releaseSeconds * sampleRate));
  const deque = new Int32Array(frames + 1);
  let head = 0, tail = 0, right = -1, currentLimiterGain = 1;

  for (let chunkStart = 0; chunkStart < frames; chunkStart += chunkSize) {
    const chunkEnd = Math.min(frames, chunkStart + chunkSize);
    for (let frame = chunkStart; frame < chunkEnd; frame++) {
      const end = Math.min(frames - 1, frame + lookAhead);
      while (right < end) {
        right++;
        while (tail > head && framePeaks[deque[tail - 1]] <= framePeaks[right]) tail--;
        deque[tail++] = right;
      }
      while (tail > head && deque[head] < frame) head++;
      const futurePeak = tail > head ? framePeaks[deque[head]] : framePeaks[frame];
      const desiredGain = futurePeak > 0 ? Math.min(1, ceilingLinear / (futurePeak * staticGain)) : 1;
      if (desiredGain < currentLimiterGain) currentLimiterGain = desiredGain;
      else currentLimiterGain = desiredGain + (currentLimiterGain - desiredGain) * releaseCoefficient;
      const finalGain = staticGain * currentLimiterGain;
      for (let channel = 0; channel < channels; channel++) {
        outputChannels[channel][frame] = Math.max(-1, Math.min(1, inputChannels[channel][frame] * finalGain));
      }
    }
    if (onProgress) onProgress(20 + (chunkEnd / frames) * 45);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return output;
}

async function buildMasteredAudio(track, targetLufs, ceilingDb, format, bitrate, progressCallback = null) {
  const report = (percent, message) => { if (progressCallback) progressCallback(percent, message); };
  report(2, `Открываю исходный файл: ${track.name}`);
  const audioContext = await getAudioContext();
  let sourceBytes = await track.file.arrayBuffer();
  let masterInput = await audioContext.decodeAudioData(sourceBytes.slice(0));
  sourceBytes = null;
  let mastered = await createLimitedMaster(masterInput, track.lufs, targetLufs, ceilingDb, (percent) => report(percent, `Нормализую и ограничиваю пики: ${track.name}`));
  masterInput = null;
  report(70, 'Проверяю итоговую громкость и True Peak…');
  await new Promise((resolve) => setTimeout(resolve, 0));
  let peak = await measureApproxTruePeak(mastered, (percent) => report(70 + percent * 0.12, 'Измеряю True Peak после обработки…'));
  if (peak > ceilingDb + 0.05) {
    const correction = masterDbToGain(ceilingDb - peak - 0.05);
    for (let channel = 0; channel < mastered.numberOfChannels; channel++) {
      const data = mastered.getChannelData(channel);
      for (let index = 0; index < data.length; index++) data[index] *= correction;
    }
    peak = await measureApproxTruePeak(mastered);
  }
  const finalLufs = await analyzeIntegratedLufs(mastered);
  let output;
  if (format === 'mp3') {
    report(92, `Кодирую MP3 · ${bitrate} kbps…`);
    output = await encodeMp3(mastered, bitrate, (percent) =>
      report(92 + percent * 0.08, `Кодирую MP3… ${Math.round(percent)}%`));
  } else if (format === 'flac') {
    report(92, 'Кодирую FLAC без потерь…');
    output = await encodeFlac(mastered, (percent) =>
      report(92 + percent * 0.08, `Кодирую FLAC… ${Math.round(percent)}%`));
  } else {
    report(92, 'Создаю 24-bit WAV…');
    await new Promise((resolve) => setTimeout(resolve, 0));
    output = encodeWav(mastered, 24);
  }
  mastered = null;
  report(100, 'Готово');
  return { output, finalLufs, peak, format };
}

async function masterAndDownload(trackId, button) {
  const track = mastering.tracks.find((item) => item.id === trackId);
  if (!track || !Number.isFinite(track.lufs) || mastering.busy) return;
  mastering.busy = true;
  setMasterControlsDisabled(true);
  const targetLufs = mastering.targetLufs;
  const ceilingDb = mastering.truePeakCeiling;
  button.disabled = true;
  button.textContent = 'Master…';
  renderMasterStats();
  try {
    const format = selectedFormat(elements.masterExportFormat);
    const bitrate = selectedBitrate(elements.masterMp3Bitrate);
    const result = await buildMasteredAudio(track, targetLufs, ceilingDb, format, bitrate,
      (percent, message) => setMasterProgress(percent, message));
    const targetTag = `${Math.abs(targetLufs).toFixed(1).replace('.', '-')}-LUFS`;
    downloadBlob(result.output, `${cleanAudioName(track.name)}-mastered-${targetTag}.${format}`);
    track.masteredLufs = result.finalLufs;
    track.masteredPeak = result.peak;
    showToast(`Готово: ${formatLufs(result.finalLufs)} · ${formatDbtp(result.peak)}`);
  } catch (error) {
    console.error('Mastering export failed:', error);
    showToast(error.message || 'Не удалось подготовить мастер-файл.');
  } finally {
    mastering.busy = false;
    setMasterControlsDisabled(false);
    hideMasterProgress();
    renderMasterTrackList();
  }
}

async function masterAllAndDownload() {
  if (mastering.busy) return;
  const readyTracks = mastering.tracks.filter((track) => Number.isFinite(track.lufs));
  if (!readyTracks.length) { showToast('Сначала добавь и проанализируй аудиофайлы.'); return; }
  mastering.busy = true;
  setMasterControlsDisabled(true);
  const targetLufs = mastering.targetLufs;
  const ceilingDb = mastering.truePeakCeiling;
  const format = selectedFormat(elements.masterExportFormat);
  const bitrate = selectedBitrate(elements.masterMp3Bitrate);
  renderMasterTrackList();
  try {
    for (let index = 0; index < readyTracks.length; index++) {
      const track = readyTracks[index];
      const base = (index / readyTracks.length) * 100;
      setMasterProgress(base, `Мастеринг ${index + 1} из ${readyTracks.length}: ${track.name}`);
      const result = await buildMasteredAudio(track, targetLufs, ceilingDb, format, bitrate, (percent, message) => {
        setMasterProgress(((index + percent / 100) / readyTracks.length) * 100, `${index + 1}/${readyTracks.length} · ${message}`);
      });
      const targetTag = `${Math.abs(targetLufs).toFixed(1).replace('.', '-')}-LUFS`;
      downloadBlob(result.output, `${cleanAudioName(track.name)}-mastered-${targetTag}.${format}`);
      track.masteredLufs = result.finalLufs;
      track.masteredPeak = result.peak;
      renderMasterTrackList();
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    setMasterProgress(100, `Готово: подготовлено ${readyTracks.length} файлов`);
    showToast(`Альбом обработан: ${readyTracks.length} ${format.toUpperCase()}-файлов. Проверь разрешение браузера на множественные загрузки.`);
  } catch (error) {
    console.error('Batch mastering failed:', error);
    showToast(error.message || 'Не удалось завершить пакетный мастеринг.');
  } finally {
    mastering.busy = false;
    setMasterControlsDisabled(false);
    hideMasterProgress();
    renderMasterTrackList();
  }
}

function removeMasterTrack(trackId) {
  if (mastering.busy) return;
  mastering.tracks = mastering.tracks.filter((track) => track.id !== trackId);
  renderMasterTrackList();
}

function clearMasterTracks() {
  if (mastering.busy) return;
  mastering.tracks = [];
  renderMasterTrackList();
  hideMasterProgress();
  showToast('Список альбома очищен.');
}

function wireViewNavigation() {
  // Delegate in capture phase so every navigation entry (sidebar and mobile tabs)
  // is handled consistently, even if nested icons/text are clicked.
  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[data-view]');
    if (!link) return;
    event.preventDefault();
    switchView(link.dataset.view);
  }, true);

  // Allow browser back/forward or manually edited hashes to restore the right panel.
  window.addEventListener('hashchange', () => {
    const hash = location.hash.toLowerCase();
    if (hash === '#mastering' || hash === '#masteringview') switchView('mastering');
    else if (hash === '#library') switchView('queue');
    else if (hash === '#editor' || !hash) switchView('remix');
  });
}

function wireMasteringEvents() {
  wireViewNavigation();
  elements.masterDropzone.addEventListener('click', () => elements.masterFileInput.click());
  elements.masterFileInput.addEventListener('change', async (event) => {
    await addMasterFiles(event.target.files);
    event.target.value = '';
  });
  ['dragenter', 'dragover'].forEach((type) => elements.masterDropzone.addEventListener(type, (event) => {
    event.preventDefault();
    elements.masterDropzone.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach((type) => elements.masterDropzone.addEventListener(type, (event) => {
    event.preventDefault();
    elements.masterDropzone.classList.remove('dragover');
  }));
  elements.masterDropzone.addEventListener('drop', (event) => addMasterFiles(event.dataTransfer.files));
  elements.masterClearButton.addEventListener('click', clearMasterTracks);
  elements.masterAllButton.addEventListener('click', masterAllAndDownload);
  elements.masterTargetSlider.addEventListener('input', () => updateMasterTarget(elements.masterTargetSlider.value));
  document.querySelectorAll('.target-preset').forEach((button) => button.addEventListener('click', () => updateMasterTarget(button.dataset.target)));
  elements.truePeakCeiling.addEventListener('change', () => {
    mastering.truePeakCeiling = Number(elements.truePeakCeiling.value);
    mastering.tracks.forEach((track) => { track.masteredLufs = null; track.masteredPeak = null; });
    renderMasterTrackList();
  });
  elements.masterTrackList.addEventListener('click', (event) => {
    const download = event.target.closest('[data-master-download]');
    const remove = event.target.closest('[data-master-remove]');
    if (download) masterAndDownload(download.dataset.masterDownload, download);
    if (remove) removeMasterTrack(remove.dataset.masterRemove);
  });
}

function switchEditorTab(tabName) {
  elements.editorTabButtons.forEach((button) => {
    const active = button.dataset.editorTab === tabName;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  elements.editorTabPanels.forEach((panel) => {
    const active = panel.id === 'editorTab' + tabName[0].toUpperCase() + tabName.slice(1);
    panel.hidden = !active;
    panel.classList.toggle('active', active);
  });
}

function updateAdvancedLabels() {
  const items = [
    ['eqLowValue', state.eqLow, ' dB'], ['eqLowMidValue', state.eqLowMid, ' dB'],
    ['eqMidValue', state.eqMid, ' dB'], ['eqHighMidValue', state.eqHighMid, ' dB'], ['eqHighValue', state.eqHigh, ' dB'],
  ];
  items.forEach(([id, value, suffix]) => { $(id).textContent = `${value > 0 ? '+' : ''}${value}${suffix}`; });
  elements.compressorValue.textContent = state.compressor ? `${state.compressor}%` : 'Off';
  elements.stereoWidthValue.textContent = `${state.stereoWidth}%`;
  elements.saturationValue.textContent = state.saturation ? `${state.saturation}%` : 'Off';
  elements.tapeValue.textContent = state.tape ? `${state.tape}%` : 'Off';
  elements.delayValue.textContent = state.delay ? `${state.delay}%` : 'Off';
  elements.chorusValue.textContent = state.chorus ? `${state.chorus}%` : 'Off';
  [elements.eqLowSlider, elements.eqLowMidSlider, elements.eqMidSlider, elements.eqHighMidSlider, elements.eqHighSlider,
    elements.compressorSlider, elements.stereoWidthSlider, elements.saturationSlider, elements.tapeSlider, elements.delaySlider, elements.chorusSlider].forEach(updateSliderFill);
}

function updateToolsControls() {
  const track = getSelectedTrack();
  const duration = track?.duration || 0;
  const max = Math.max(.1, duration);
  if (track) {
    state.trimStart = Math.max(0, Math.min(max - .05, Number(state.trimStart) || 0));
    state.trimEnd = Math.max(state.trimStart + .05, Math.min(max, Number(state.trimEnd ?? max) || max));
  } else {
    state.trimStart = 0;
    state.trimEnd = 0;
  }
  elements.trimStartInput.max = String(max);
  elements.trimEndInput.max = String(max);
  elements.trimStartInput.value = track ? state.trimStart.toFixed(2) : '0';
  elements.trimEndInput.value = track ? state.trimEnd.toFixed(2) : '0';
  elements.trimStartInput.disabled = !track;
  elements.trimEndInput.disabled = !track;
  elements.trimDurationValue.textContent = track ? formatTime(state.trimEnd - state.trimStart) : '—';
  elements.fadeInSlider.value = String(state.fadeIn);
  elements.fadeOutSlider.value = String(state.fadeOut);
  elements.fadeInValue.textContent = `${state.fadeIn.toFixed(1)} s`;
  elements.fadeOutValue.textContent = `${state.fadeOut.toFixed(1)} s`;
  elements.reverseToggle.checked = state.reverse;
  [elements.fadeInSlider, elements.fadeOutSlider].forEach(updateSliderFill);
}

function restartPlaybackAfterToolChange() {
  const track = getSelectedTrack();
  if (!track) return;
  const wasPlaying = state.isPlaying;
  let position = wasPlaying ? getCurrentPosition() : state.pausedPosition;
  if (wasPlaying) stopPlayback(false);
  const bounds = getTrimBounds(track);
  position = Math.max(bounds.start, Math.min(bounds.end, position));
  if (state.reverse && position <= bounds.start + .01) position = bounds.end;
  if (!state.reverse && position >= bounds.end - .01) position = bounds.start;
  state.pausedPosition = position;
  updateToolsControls();
  elements.currentTime.textContent = formatTime(position);
  elements.miniProgressFill.style.width = `${(position / track.duration) * 100}%`;
  drawWaveform(track.buffer, position / track.duration);
  if (wasPlaying) startPlayback(position);
}

function resetAdvancedEffects() {
  Object.assign(state, { eqLow: 0, eqLowMid: 0, eqMid: 0, eqHighMid: 0, eqHigh: 0,
    compressor: 0, stereoWidth: 100, saturation: 0, tape: 0, delay: 0, chorus: 0 });
  elements.eqLowSlider.value = '0'; elements.eqLowMidSlider.value = '0'; elements.eqMidSlider.value = '0';
  elements.eqHighMidSlider.value = '0'; elements.eqHighSlider.value = '0';
  elements.compressorSlider.value = '0'; elements.stereoWidthSlider.value = '100';
  elements.saturationSlider.value = '0'; elements.tapeSlider.value = '0';
  elements.delaySlider.value = '0'; elements.chorusSlider.value = '0';
  updateAdvancedLabels();
  if (state.audioContext) applyAdvancedGraphSettings(state, state, state.audioContext);
}

function resetRemixTools() {
  const track = getSelectedTrack();
  const wasPlaying = state.isPlaying;
  if (wasPlaying) stopPlayback(false);
  state.trimStart = 0; state.trimEnd = track?.duration || 0;
  state.fadeIn = 0; state.fadeOut = 0; state.reverse = false;
  state.pausedPosition = 0;
  updateToolsControls();
  if (track) {
    elements.currentTime.textContent = '0:00';
    elements.miniProgressFill.style.width = '0%';
    drawWaveform(track.buffer, 0);
  }
  if (wasPlaying) startPlayback(0);
}

function applyTrimInput(which) {
  const track = getSelectedTrack();
  if (!track) return;
  const previousPosition = state.isPlaying ? getCurrentPosition() : state.pausedPosition;
  const nextValue = Number(which === 'start' ? elements.trimStartInput.value : elements.trimEndInput.value);
  if (!Number.isFinite(nextValue)) { updateToolsControls(); return; }
  if (which === 'start') state.trimStart = Math.max(0, Math.min(track.duration - .05, nextValue));
  else state.trimEnd = Math.max(.05, Math.min(track.duration, nextValue));
  if (state.trimEnd <= state.trimStart + .05) {
    if (which === 'start') state.trimStart = Math.max(0, state.trimEnd - .05);
    else state.trimEnd = Math.min(track.duration, state.trimStart + .05);
  }
  state.pausedPosition = Math.max(state.trimStart, Math.min(state.trimEnd, previousPosition));
  restartPlaybackAfterToolChange();
}

function wireEvents() {
  elements.editorTabButtons.forEach((button) => button.addEventListener('click', () => switchEditorTab(button.dataset.editorTab)));
  const advancedControls = [
    [elements.eqLowSlider, 'eqLow'], [elements.eqLowMidSlider, 'eqLowMid'], [elements.eqMidSlider, 'eqMid'],
    [elements.eqHighMidSlider, 'eqHighMid'], [elements.eqHighSlider, 'eqHigh'],
    [elements.compressorSlider, 'compressor'], [elements.stereoWidthSlider, 'stereoWidth'],
    [elements.saturationSlider, 'saturation'], [elements.tapeSlider, 'tape'],
    [elements.delaySlider, 'delay'], [elements.chorusSlider, 'chorus'],
  ];
  advancedControls.forEach(([slider, key]) => slider.addEventListener('input', () => {
    state[key] = Number(slider.value);
    state.activePreset = null;
    updatePresetSelection();
    updateAdvancedLabels();
    if (state.audioContext) applyAdvancedGraphSettings(state, state, state.audioContext);
  }));
  elements.eqResetButton.addEventListener('click', () => {
    state.eqLow = 0; state.eqLowMid = 0; state.eqMid = 0; state.eqHighMid = 0; state.eqHigh = 0;
    [elements.eqLowSlider, elements.eqLowMidSlider, elements.eqMidSlider, elements.eqHighMidSlider, elements.eqHighSlider].forEach((slider) => { slider.value = '0'; });
    updateAdvancedLabels();
    if (state.audioContext) applyAdvancedGraphSettings(state, state, state.audioContext);
  });
  elements.trimStartInput.addEventListener('change', () => applyTrimInput('start'));
  elements.trimEndInput.addEventListener('change', () => applyTrimInput('end'));
  elements.fadeInSlider.addEventListener('input', () => { state.fadeIn = Number(elements.fadeInSlider.value); updateToolsControls(); });
  elements.fadeOutSlider.addEventListener('input', () => { state.fadeOut = Number(elements.fadeOutSlider.value); updateToolsControls(); });
  elements.fadeInSlider.addEventListener('change', restartPlaybackAfterToolChange);
  elements.fadeOutSlider.addEventListener('change', restartPlaybackAfterToolChange);
  elements.reverseToggle.addEventListener('change', () => { state.reverse = elements.reverseToggle.checked; restartPlaybackAfterToolChange(); });
  elements.resetToolsButton.addEventListener('click', resetRemixTools);

  const chooseFiles = () => elements.fileInput.click();
  elements.addFilesButton.addEventListener('click', chooseFiles);
  elements.addMoreButton.addEventListener('click', chooseFiles);
  elements.dropzone.addEventListener('click', chooseFiles);
  elements.fileInput.addEventListener('change', async (event) => {
    await addFiles(event.target.files);
    event.target.value = '';
  });
  ['dragenter', 'dragover'].forEach((name) => elements.dropzone.addEventListener(name, (event) => {
    event.preventDefault(); elements.dropzone.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach((name) => elements.dropzone.addEventListener(name, (event) => {
    event.preventDefault(); elements.dropzone.classList.remove('dragover');
  }));
  elements.dropzone.addEventListener('drop', async (event) => addFiles(event.dataTransfer.files));
  document.addEventListener('dragover', (event) => event.preventDefault());
  document.addEventListener('drop', (event) => {
    if (!elements.dropzone.contains(event.target) && !elements.masterDropzone.contains(event.target)) {
      event.preventDefault();
      if (elements.masteringView.contains(event.target)) addMasterFiles(event.dataTransfer.files);
      else addFiles(event.dataTransfer.files);
    }
  });
  elements.clearButton.addEventListener('click', () => {
    stopPlayback(true); state.tracks = []; resetEditor(); showToast('Очередь очищена.');
  });
  elements.playButton.addEventListener('click', togglePlayback);
  elements.previousButton.addEventListener('click', () => changeTrack(-1));
  elements.nextButton.addEventListener('click', () => changeTrack(1));
  elements.loopButton.addEventListener('click', () => {
    state.isLooping = !state.isLooping;
    elements.loopButton.classList.toggle('active', state.isLooping);
    showToast(state.isLooping ? 'Повтор трека включён' : 'Повтор трека выключен');
  });
  elements.waveWrap.addEventListener('click', (event) => {
    const rect = elements.waveWrap.getBoundingClientRect();
    seekTo((event.clientX - rect.left) / rect.width);
  });
  document.querySelectorAll('.preset-card[data-preset]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.preset;
      applySettings(PRESETS[key], false, key);
      if (key === 'none') {
        resetAdvancedEffects();
        resetRemixTools();
      }
      setStatus('Настройки пресета применены.');
      showToast(`${button.querySelector('strong').textContent} — пресет применён.`);
    });
  });
  $('resetButton').addEventListener('click', () => { applySettings(PRESETS.none, false, 'none'); resetAdvancedEffects(); resetRemixTools(); setStatus('Все эффекты и монтаж сброшены.'); showToast('Исходное звучание восстановлено.'); });
  const controls = [
    [elements.speedSlider, 'speed'], [elements.pitchSlider, 'pitch'], [elements.reverbSlider, 'reverb'],
    [elements.bassSlider, 'bass'], [elements.volumeSlider, 'volume'],
  ];
  controls.forEach(([slider, key]) => slider.addEventListener('input', () => {
    const settings = { speed: state.speed, pitch: state.pitch, reverb: state.reverb, bass: state.bass, volume: state.volume };
    settings[key] = Number(slider.value);
    applySettings(settings, false, null);
    if (key === 'speed') setStatus('Скорость изменена.');
  }));
  elements.quickVolume.addEventListener('input', () => {
    const settings = { speed: state.speed, pitch: state.pitch, reverb: state.reverb, bass: state.bass, volume: Number(elements.quickVolume.value) };
    applySettings(settings, false, null);
  });
  elements.downloadButton.addEventListener('click', exportTrack);
  elements.exportFormat.addEventListener('change', updateExportFormatControls);
  elements.masterExportFormat.addEventListener('change', updateExportFormatControls);
  window.addEventListener('resize', drawProgressAfterResize);
  window.addEventListener('keydown', (event) => {
    const tag = document.activeElement?.tagName;
    if (event.code === 'Space' && !['INPUT', 'BUTTON', 'TEXTAREA'].includes(tag)) { event.preventDefault(); togglePlayback(); }
  });
}

function initialize() {
  updateEffectLabels();
  updatePresetSelection();
  renderTrackList();
  wireEvents();
  wireMasteringEvents();
  updateMasterTarget(-14);
  renderMasterTrackList();
  updateExportFormatControls();
  updateAdvancedLabels();
  updateToolsControls();
  switchEditorTab('sound');
  initializeViewFromLocation();
}

initialize();
