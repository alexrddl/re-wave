const $ = (id) => document.getElementById(id);

const PRESETS = {
  original: { speed: 1, pitch: 0, reverb: 0, bass: 0, volume: 100 },
  slowed: { speed: 0.86, pitch: -2, reverb: 46, bass: 2, volume: 100 },
  nightcore: { speed: 1.2, pitch: 4, reverb: 4, bass: 1, volume: 100 },
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
  convolver: null,
  dryGain: null,
  wetGain: null,
  masterGain: null,
  limiter: null,
  isPlaying: false,
  isLooping: false,
  offsetAtStart: 0,
  startedAt: 0,
  pausedPosition: 0,
  speed: 1,
  pitch: 0,
  reverb: 0,
  bass: 0,
  volume: 100,
  raf: null,
  toastTimer: null,
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
  elements.pitchValue.textContent = `${state.pitch > 0 ? '+' : ''}${state.pitch} st`;
  elements.reverbValue.textContent = `${state.reverb}%`;
  elements.bassValue.textContent = `${state.bass > 0 ? '+' : ''}${state.bass} dB`;
  elements.volumeValue.textContent = `${state.volume}%`;
  [elements.speedSlider, elements.pitchSlider, elements.reverbSlider, elements.bassSlider, elements.volumeSlider, elements.quickVolume].forEach(updateSliderFill);
  elements.quickVolume.value = String(state.volume);
}

function applySettings(settings, announce = true) {
  const oldEffectiveRate = state.usingFallback
    ? state.speed * Math.pow(2, state.pitch / 12)
    : state.speed;
  const newEffectiveRate = state.usingFallback
    ? settings.speed * Math.pow(2, settings.pitch / 12)
    : settings.speed;
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
  elements.speedSlider.value = String(state.speed);
  elements.pitchSlider.value = String(state.pitch);
  elements.reverbSlider.value = String(state.reverb);
  elements.bassSlider.value = String(state.bass);
  elements.volumeSlider.value = String(state.volume);
  updateEffectLabels();

  if (state.source && state.isPlaying) {
    const now = state.audioContext.currentTime;
    const effectiveRate = state.usingFallback ? state.speed * Math.pow(2, state.pitch / 12) : state.speed;
    state.source.playbackRate.setTargetAtTime(effectiveRate, now, 0.025);
    if (state.stNode) {
      state.stNode.playbackRate.setTargetAtTime(state.speed, now, 0.025);
      state.stNode.pitchSemitones.setTargetAtTime(state.pitch, now, 0.025);
    }
  }
  if (state.eq) state.eq.gain.setTargetAtTime(state.bass, state.audioContext.currentTime, 0.025);
  if (state.dryGain) state.dryGain.gain.setTargetAtTime(1 - (state.reverb / 100) * 0.24, state.audioContext.currentTime, 0.025);
  if (state.wetGain) state.wetGain.gain.setTargetAtTime((state.reverb / 100) * 0.72, state.audioContext.currentTime, 0.025);
  if (state.masterGain) state.masterGain.gain.setTargetAtTime(state.volume / 100, state.audioContext.currentTime, 0.025);
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
  state.pausedPosition = 0;
  elements.currentTrackName.textContent = track.name;
  elements.currentTrackInfo.textContent = `${formatTime(track.duration)} · ${formatBytes(track.size)} · ${track.buffer.numberOfChannels} ch`;
  elements.playerTrackName.textContent = track.name;
  elements.playerTrackMeta.textContent = `${formatTime(track.duration)} · ${track.buffer.sampleRate.toLocaleString('ru-RU')} Hz`;
  elements.duration.textContent = formatTime(track.duration);
  elements.currentTime.textContent = '0:00';
  elements.downloadButton.disabled = false;
  elements.wavePlaceholder.style.display = 'none';
  renderTrackList();
  drawWaveform(track.buffer, 0);
  applySettings(PRESETS.original, false);
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
  applySettings(PRESETS.original, false);
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
    ctx.fillStyle = (i / bars) <= progress ? '#e6a7fb' : 'rgba(181,132,202,.45)';
    roundRect(ctx, x, y, barW, barH, barW / 2);
  }
  if (progress > 0) {
    const x = Math.min(width - 1, width * progress);
    ctx.fillStyle = '#fff2ff';
    ctx.shadowColor = '#e1a0ff';
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
  if (state.isPlaying && state.audioContext) {
    const elapsed = Math.max(0, state.audioContext.currentTime - state.startedAt);
    const effectiveRate = state.usingFallback ? state.speed * Math.pow(2, state.pitch / 12) : state.speed;
    return Math.min(track.duration, state.offsetAtStart + elapsed * effectiveRate);
  }
  return Math.min(track.duration, state.pausedPosition);
}

function updateProgress() {
  const track = getSelectedTrack();
  if (!track) return;
  const position = getCurrentPosition();
  const ratio = track.duration ? position / track.duration : 0;
  elements.currentTime.textContent = formatTime(position);
  elements.miniProgressFill.style.width = `${ratio * 100}%`;
  drawWaveform(track.buffer, ratio);
  if (state.isPlaying && position >= track.duration) {
    if (state.isLooping) {
      startPlayback(0);
    } else {
      state.pausedPosition = 0;
      stopPlayback(false);
      elements.currentTime.textContent = '0:00';
      drawWaveform(track.buffer, 0);
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

function buildEffectGraph(ctx, sourceNode, useSoundTouch = false) {
  const eq = ctx.createBiquadFilter();
  eq.type = 'lowshelf';
  eq.frequency.value = 145;
  eq.gain.value = state.bass;
  const dry = ctx.createGain();
  const convolver = ctx.createConvolver();
  convolver.buffer = createImpulse(ctx);
  const wet = ctx.createGain();
  const master = ctx.createGain();
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 2;
  limiter.ratio.value = 10;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.18;
  dry.gain.value = 1 - state.reverb / 100 * .24;
  wet.gain.value = state.reverb / 100 * .72;
  master.gain.value = state.volume / 100;
  sourceNode.connect(eq);
  eq.connect(dry); dry.connect(master);
  eq.connect(convolver); convolver.connect(wet); wet.connect(master);
  master.connect(limiter); limiter.connect(ctx.destination);
  return { eq, dryGain: dry, wetGain: wet, convolver, masterGain: master, limiter };
}

async function startPlayback(position = state.pausedPosition) {
  const track = getSelectedTrack();
  if (!track) { showToast('Сначала добавь аудиофайл.'); return; }
  try {
    const ctx = await getAudioContext();
    const hasWorklet = await loadSoundTouch(ctx);
    const source = ctx.createBufferSource();
    source.buffer = track.buffer;
    source.playbackRate.value = state.speed;
    state.usingFallback = !hasWorklet;
    let inputNode = source;
    let stNode = null;
    if (hasWorklet) {
      stNode = new state.soundTouchNodeClass({ context: ctx });
      source.connect(stNode);
      stNode.playbackRate.value = state.speed;
      stNode.pitchSemitones.value = state.pitch;
      inputNode = stNode;
    } else {
      // Fallback: native playback rate changes both tempo and pitch together.
      source.playbackRate.value = state.speed * Math.pow(2, state.pitch / 12);
    }
    const graph = buildEffectGraph(ctx, inputNode);
    state.source = source;
    state.stNode = stNode;
    Object.assign(state, graph);
    state.offsetAtStart = Math.max(0, Math.min(position, track.duration));
    state.startedAt = ctx.currentTime;
    state.pausedPosition = state.offsetAtStart;
    state.isPlaying = true;
    source.onended = () => {
      if (state.source === source && state.isPlaying && !state.isLooping) {
        state.isPlaying = false;
        state.pausedPosition = 0;
        state.source = null;
        state.stNode = null;
        cancelAnimationFrame(state.raf);
        updatePlayButton(false);
        elements.currentTime.textContent = '0:00';
        elements.miniProgressFill.style.width = '0%';
        drawWaveform(track.buffer, 0);
      }
    };
    source.start(0, state.offsetAtStart);
    updatePlayButton(true);
    cancelAnimationFrame(state.raf);
    state.raf = requestAnimationFrame(updateProgress);
    if (!hasWorklet) {
      setStatus('Запасной режим: Speed и Pitch связаны. Для независимой обработки проверь подключение к CDN.', 'error');
    } else {
      setStatus('Воспроизведение с независимыми Speed и Pitch.', 'success');
    }
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
  state.source = null;
  state.stNode = null;
  updatePlayButton(false);
}

function updatePlayButton(playing) {
  elements.playIcon.textContent = playing ? 'Ⅱ' : '▶';
  elements.playButton.setAttribute('aria-label', playing ? 'Пауза' : 'Воспроизвести');
  elements.playButton.title = playing ? 'Пауза' : 'Воспроизвести';
}

async function togglePlayback() {
  if (!getSelectedTrack()) { showToast('Сначала добавь трек в очередь.'); return; }
  if (state.isPlaying) {
    stopPlayback(true);
    setStatus('Пауза. Нажми Play, чтобы продолжить.');
  } else {
    const track = getSelectedTrack();
    const position = state.pausedPosition >= track.duration ? 0 : state.pausedPosition;
    await startPlayback(position);
  }
}

function seekTo(ratio) {
  const track = getSelectedTrack();
  if (!track) return;
  const position = Math.max(0, Math.min(1, ratio)) * track.duration;
  const wasPlaying = state.isPlaying;
  if (wasPlaying) stopPlayback(false);
  state.pausedPosition = position;
  elements.currentTime.textContent = formatTime(position);
  elements.miniProgressFill.style.width = `${ratio * 100}%`;
  drawWaveform(track.buffer, ratio);
  if (wasPlaying) startPlayback(position);
}

function changeTrack(direction) {
  if (!state.tracks.length) return;
  const index = state.tracks.findIndex((track) => track.id === state.selectedId);
  const next = (index + direction + state.tracks.length) % state.tracks.length;
  selectTrack(state.tracks[next].id);
  startPlayback(0);
}

function drawProgressAfterResize() {
  const track = getSelectedTrack();
  if (track) drawWaveform(track.buffer, getCurrentPosition() / track.duration);
}

function encodeWav(buffer) {
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const frames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = frames * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);
  const writeString = (offset, text) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
  writeString(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); writeString(8, 'WAVE');
  writeString(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, channels, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); writeString(36, 'data'); view.setUint32(40, dataSize, true);
  const channelData = Array.from({ length: channels }, (_, i) => buffer.getChannelData(i));
  let offset = 44;
  for (let frame = 0; frame < frames; frame++) {
    for (let channel = 0; channel < channels; channel++) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][frame]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

async function renderEffects(inputBuffer, settings) {
  const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OfflineContext) throw new Error('OfflineAudioContext не поддерживается этим браузером.');
  const tailSeconds = settings.reverb > 0 ? 2.8 : 0;
  const length = inputBuffer.length + Math.ceil(inputBuffer.sampleRate * tailSeconds);
  const ctx = new OfflineContext(inputBuffer.numberOfChannels, length, inputBuffer.sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = inputBuffer;
  const eq = ctx.createBiquadFilter(); eq.type = 'lowshelf'; eq.frequency.value = 145; eq.gain.value = settings.bass;
  const dry = ctx.createGain(); dry.gain.value = 1 - settings.reverb / 100 * .24;
  const convolver = ctx.createConvolver(); convolver.buffer = createImpulse(ctx);
  const wet = ctx.createGain(); wet.gain.value = settings.reverb / 100 * .72;
  const master = ctx.createGain(); master.gain.value = settings.volume / 100;
  const limiter = ctx.createDynamicsCompressor(); limiter.threshold.value = -3; limiter.knee.value = 2; limiter.ratio.value = 10; limiter.attack.value = .003; limiter.release.value = .18;
  source.connect(eq); eq.connect(dry); dry.connect(master); eq.connect(convolver); convolver.connect(wet); wet.connect(master);
  master.connect(limiter); limiter.connect(ctx.destination);
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
    if ((Math.abs(state.speed - 1) > .001 || state.pitch !== 0) && !state.processOffline && !state.workletFailed) {
      const context = await getAudioContext();
      await loadSoundTouch(context);
    }
    if (Math.abs(state.speed - 1) > .001 || state.pitch !== 0) {
      if (state.processOffline && !state.workletFailed) {
        setStatus('Изменяю темп и высоту тона…');
        processed = await state.processOffline({
          input: track.buffer,
          processorUrl: state.processorUrl,
          pitchSemitones: state.pitch,
          playbackRate: state.speed,
          stretchParameters: { overlapMs: 12 },
        });
      } else {
        setStatus('Применяю запасной режим изменения скорости и тона…');
        const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        const rate = state.speed * Math.pow(2, state.pitch / 12);
        const outLength = Math.ceil(track.buffer.length / rate);
        const ctx = new OfflineContext(track.buffer.numberOfChannels, outLength, track.buffer.sampleRate);
        const source = ctx.createBufferSource(); source.buffer = track.buffer; source.playbackRate.value = rate; source.connect(ctx.destination); source.start(0);
        processed = await ctx.startRendering();
      }
    }
    setStatus('Применяю Reverb, Bass и Volume…');
    const rendered = await renderEffects(processed, state);
    setStatus('Создаю WAV-файл…');
    const wav = encodeWav(rendered);
    const cleanBase = track.name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '_');
    downloadBlob(wav, `${cleanBase}-rewave.wav`);
    setStatus('Готово! Обработанный WAV скачан.', 'success');
    showToast('Ремикс готов — WAV-файл скачан ✨');
  } catch (error) {
    console.error('Export failed:', error);
    setStatus(error.message || 'Не удалось экспортировать файл.', 'error');
    showToast('Ошибка экспорта. Попробуй трек меньшего размера.');
  } finally {
    button.disabled = !getSelectedTrack();
    buttonLabel.textContent = 'Скачать WAV';
  }
}

function wireEvents() {
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
    if (!elements.dropzone.contains(event.target)) { event.preventDefault(); addFiles(event.dataTransfer.files); }
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
  elements.slowedPreset?.addEventListener('click', () => { applySettings(PRESETS.slowed); showToast('Slowed + Reverb применён ☾'); });
  elements.nightcorePreset?.addEventListener('click', () => { applySettings(PRESETS.nightcore); showToast('Nightcore применён ✧'); });
  $('resetButton').addEventListener('click', () => { applySettings(PRESETS.original); showToast('Все эффекты сброшены.'); });
  const controls = [
    [elements.speedSlider, 'speed'], [elements.pitchSlider, 'pitch'], [elements.reverbSlider, 'reverb'],
    [elements.bassSlider, 'bass'], [elements.volumeSlider, 'volume'],
  ];
  controls.forEach(([slider, key]) => slider.addEventListener('input', () => {
    const settings = { speed: state.speed, pitch: state.pitch, reverb: state.reverb, bass: state.bass, volume: state.volume };
    settings[key] = Number(slider.value);
    applySettings(settings, false);
    if (key === 'speed') setStatus('Скорость изменена.');
  }));
  elements.quickVolume.addEventListener('input', () => {
    const settings = { speed: state.speed, pitch: state.pitch, reverb: state.reverb, bass: state.bass, volume: Number(elements.quickVolume.value) };
    applySettings(settings, false);
  });
  elements.downloadButton.addEventListener('click', exportTrack);
  window.addEventListener('resize', drawProgressAfterResize);
  window.addEventListener('keydown', (event) => {
    const tag = document.activeElement?.tagName;
    if (event.code === 'Space' && !['INPUT', 'BUTTON', 'TEXTAREA'].includes(tag)) { event.preventDefault(); togglePlayback(); }
  });
}

function initialize() {
  updateEffectLabels();
  renderTrackList();
  wireEvents();
}

initialize();
