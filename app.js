const state = {
  isMirrored: false,
  loopA: null,
  loopB: null,
  bpm: 120,
  offset: 0,
  markers: [],
  dancers: [
    { id: 1, label: '1', x: 90,  y: 110 },
    { id: 2, label: '2', x: 160, y: 80  },
    { id: 3, label: '3', x: 230, y: 110 }
  ],
  activeDancer: null
};

const dom = {
  video: document.getElementById('danceVideo'),
  videoUpload: document.getElementById('videoUpload'),
  uploadTriggerBtn: document.getElementById('uploadTriggerBtn'),
  statusReadout: document.getElementById('statusReadout'),
  videoWrapper: document.getElementById('videoWrapper'),
  emptyState: document.getElementById('emptyState'),
  mirrorBadge: document.getElementById('mirrorBadge'),
  playPauseBtn: document.getElementById('playPauseBtn'),
  mirrorBtn: document.getElementById('mirrorBtn'),
  setABtn: document.getElementById('setABtn'),
  setBBtn: document.getElementById('setBBtn'),
  clearLoopBtn: document.getElementById('clearLoopBtn'),
  speedSelect: document.getElementById('speedSelect'),
  timelineTrack: document.getElementById('timelineTrack'),
  timelineProgress: document.getElementById('timelineProgress'),
  loopRegion: document.getElementById('loopRegion'),
  markersLayer: document.getElementById('markersLayer'),
  markersList: document.getElementById('markersList'),
  cueCount: document.getElementById('cueCount'),
  markerNameInput: document.getElementById('markerNameInput'),
  addMarkerBtn: document.getElementById('addMarkerBtn'),
  currentTimeText: document.getElementById('currentTimeText'),
  durationText: document.getElementById('durationText'),
  loopStatusText: document.getElementById('loopStatusText'),
  bpmInput: document.getElementById('bpmInput'),
  offsetInput: document.getElementById('offsetInput'),
  setOffsetBtn: document.getElementById('setOffsetBtn'),
  beats: document.querySelectorAll('.beat'),
  canvas: document.getElementById('stageCanvas'),
  addDancerBtn: document.getElementById('addDancerBtn'),
  resetStageBtn: document.getElementById('resetStageBtn')
};

const ctx = dom.canvas.getContext('2d');
let currentObjectUrl = null;

function setStatus(message) {
  dom.statusReadout.textContent = message.toUpperCase();
}

function formatTimecode(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toFixed(2).padStart(5, '0');
  return `${mins}:${secs}`;
}

function loadMediaFile(file) {
  if (!file) return;
  const isValidVideo = file.type.startsWith('video/') || /\.(mp4|webm|ogg|mov|mkv)$/i.test(file.name);
  if (!isValidVideo) {
    setStatus('ERRO: FORMATO NÃO SUPORTADO');
    return;
  }

  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
  }

  currentObjectUrl = URL.createObjectURL(file);
  dom.video.src = currentObjectUrl;
  dom.video.load();
  dom.emptyState.hidden = true;
  dom.playPauseBtn.textContent = 'PLAY';
  setStatus(file.name);
}

dom.uploadTriggerBtn.addEventListener('click', () => {
  dom.videoUpload.value = '';
  dom.videoUpload.click();
});

dom.emptyState.addEventListener('click', () => {
  dom.videoUpload.value = '';
  dom.videoUpload.click();
});

dom.videoUpload.addEventListener('change', (e) => {
  if (e.target.files[0]) loadMediaFile(e.target.files[0]);
});

dom.videoWrapper.addEventListener('dragover', (e) => {
  e.preventDefault();
  dom.videoWrapper.classList.add('drag-over');
});

dom.videoWrapper.addEventListener('dragleave', () => {
  dom.videoWrapper.classList.remove('drag-over');
});

dom.videoWrapper.addEventListener('drop', (e) => {
  e.preventDefault();
  dom.videoWrapper.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) loadMediaFile(e.dataTransfer.files[0]);
});

dom.video.addEventListener('error', () => {
  setStatus('ERRO DE CODEC (USE H.264/WEBM)');
});

function togglePlayback() {
  if (!dom.video.src) return;
  if (dom.video.paused) {
    dom.video.play();
    dom.playPauseBtn.textContent = 'PAUSE';
  } else {
    dom.video.pause();
    dom.playPauseBtn.textContent = 'PLAY';
  }
}

function toggleMirror() {
  state.isMirrored = !state.isMirrored;
  dom.video.classList.toggle('mirrored', state.isMirrored);
  dom.mirrorBadge.hidden = !state.isMirrored;
}

dom.playPauseBtn.addEventListener('click', togglePlayback);
dom.mirrorBtn.addEventListener('click', toggleMirror);
dom.speedSelect.addEventListener('change', (e) => {
  dom.video.playbackRate = parseFloat(e.target.value);
});

function setLoopIn() {
  if (!dom.video.duration) return;
  state.loopA = dom.video.currentTime;
  if (state.loopB !== null && state.loopB <= state.loopA) {
    state.loopB = null;
  }
  syncLoopRegionUI();
}

function setLoopOut() {
  if (!dom.video.duration || state.loopA === null) return;
  if (dom.video.currentTime > state.loopA) {
    state.loopB = dom.video.currentTime;
    syncLoopRegionUI();
  }
}

function clearLoopBounds() {
  state.loopA = null;
  state.loopB = null;
  syncLoopRegionUI();
}

function syncLoopRegionUI() {
  const dur = dom.video.duration;
  if (state.loopA !== null && state.loopB !== null && dur) {
    const startPct = (state.loopA / dur) * 100;
    const widthPct = ((state.loopB - state.loopA) / dur) * 100;
    dom.loopRegion.style.left = `${startPct}%`;
    dom.loopRegion.style.width = `${widthPct}%`;
    dom.loopRegion.hidden = false;
    dom.loopStatusText.textContent = `LOOP: ${formatTimecode(state.loopA)} - ${formatTimecode(state.loopB)}`;
  } else if (state.loopA !== null) {
    dom.loopRegion.hidden = true;
    dom.loopStatusText.textContent = `IN: ${formatTimecode(state.loopA)} [AGUARDANDO OUT]`;
  } else {
    dom.loopRegion.hidden = true;
    dom.loopStatusText.textContent = 'LOOP: INATIVO';
  }
}

dom.setABtn.addEventListener('click', setLoopIn);
dom.setBBtn.addEventListener('click', setLoopOut);
dom.clearLoopBtn.addEventListener('click', clearLoopBounds);

function tickTransport() {
  const dur = dom.video.duration;
  if (dur) {
    const now = dom.video.currentTime;

    if (state.loopA !== null && state.loopB !== null && now >= state.loopB) {
      dom.video.currentTime = state.loopA;
    }

    dom.timelineProgress.style.width = `${(now / dur) * 100}%`;
    dom.currentTimeText.textContent = formatTimecode(now);

    const delta = now - state.offset;
    if (delta >= 0) {
      const beatDuration = 60 / state.bpm;
      const activeBeat = Math.floor(delta / beatDuration) % 8;
      dom.beats.forEach((node, idx) => {
        node.classList.toggle('active', idx === activeBeat);
      });
    } else {
      dom.beats.forEach((node) => node.classList.remove('active'));
    }
  }
  requestAnimationFrame(tickTransport);
}
requestAnimationFrame(tickTransport);

dom.video.addEventListener('loadedmetadata', () => {
  dom.durationText.textContent = formatTimecode(dom.video.duration);
  renderCuePoints();
  syncLoopRegionUI();
});

dom.timelineTrack.addEventListener('click', (e) => {
  if (!dom.video.duration) return;
  const rect = dom.timelineTrack.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  dom.video.currentTime = ratio * dom.video.duration;
});

dom.bpmInput.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  if (!Number.isNaN(val) && val >= 40 && val <= 240) {
    state.bpm = val;
  }
});

dom.offsetInput.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  state.offset = Number.isNaN(val) ? 0 : val;
});

dom.setOffsetBtn.addEventListener('click', () => {
  state.offset = Number(dom.video.currentTime.toFixed(2));
  dom.offsetInput.value = state.offset.toFixed(2);
});

function createCuePoint() {
  if (!dom.video.duration) return;
  const rawName = dom.markerNameInput.value.trim();
  const label = rawName || `CUE ${state.markers.length + 1}`;

  state.markers.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name: label,
    time: dom.video.currentTime,
    formation: structuredClone(state.dancers)
  });

  state.markers.sort((a, b) => a.time - b.time);
  dom.markerNameInput.value = '';
  renderCuePoints();
}

function renderCuePoints() {
  dom.markersLayer.replaceChildren();
  dom.markersList.replaceChildren();
  dom.cueCount.textContent = String(state.markers.length);

  const dur = dom.video.duration;
  if (!dur) return;

  state.markers.forEach((cue) => {
    const pin = document.createElement('div');
    pin.className = 'marker-pin';
    pin.style.left = `${(cue.time / dur) * 100}%`;
    dom.markersLayer.appendChild(pin);

    const item = document.createElement('li');
    item.className = 'cue-item';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = cue.name;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'cue-item-time';
    timeSpan.textContent = formatTimecode(cue.time);

    item.append(nameSpan, timeSpan);
    item.addEventListener('click', () => {
      dom.video.currentTime = cue.time;
      state.dancers = structuredClone(cue.formation);
      renderStageCanvas();
    });

    dom.markersList.appendChild(item);
  });
}

dom.addMarkerBtn.addEventListener('click', createCuePoint);

function renderStageCanvas() {
  const width = dom.canvas.width;
  const height = dom.canvas.height;
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = '#172033';
  ctx.lineWidth = 1;
  const gridStep = 32;

  for (let x = gridStep; x < width; x += gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = gridStep; y < height; y += gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Eixo central de referência do palco (Center Line)
  ctx.strokeStyle = '#25324d';
  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.stroke();

  ctx.fillStyle = '#8b9bb4';
  ctx.font = '10px Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('FRONT / MIRROR', width / 2, height - 6);

  state.dancers.forEach((dancer) => {
    ctx.beginPath();
    ctx.arc(dancer.x, dancer.y, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#090d16';
    ctx.stroke();

    ctx.fillStyle = '#090d16';
    ctx.font = 'bold 10px Consolas, monospace';
    ctx.fillText(dancer.label, dancer.x, dancer.y + 3.5);
  });
}

function getCanvasCoords(event) {
  const rect = dom.canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (dom.canvas.width / rect.width),
    y: (event.clientY - rect.top) * (dom.canvas.height / rect.height)
  };
}

dom.canvas.addEventListener('mousedown', (e) => {
  const pos = getCanvasCoords(e);
  for (let i = state.dancers.length - 1; i >= 0; i--) {
    const d = state.dancers[i];
    if (Math.hypot(pos.x - d.x, pos.y - d.y) <= 13) {
      state.activeDancer = d;
      break;
    }
  }
});

dom.canvas.addEventListener('mousemove', (e) => {
  if (!state.activeDancer) return;
  const pos = getCanvasCoords(e);
  state.activeDancer.x = Math.max(12, Math.min(dom.canvas.width - 12, pos.x));
  state.activeDancer.y = Math.max(12, Math.min(dom.canvas.height - 20, pos.y));
  renderStageCanvas();
});

window.addEventListener('mouseup', () => {
  state.activeDancer = null;
});

dom.addDancerBtn.addEventListener('click', () => {
  const nextId = state.dancers.length + 1;
  state.dancers.push({
    id: nextId,
    label: String(nextId),
    x: 40 + ((nextId * 28) % 240),
    y: 110
  });
  renderStageCanvas();
});

dom.resetStageBtn.addEventListener('click', () => {
  const spacing = dom.canvas.width / (state.dancers.length + 1);
  state.dancers.forEach((d, idx) => {
    d.x = spacing * (idx + 1);
    d.y = dom.canvas.height / 2;
  });
  renderStageCanvas();
});

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

  switch (e.key.toLowerCase()) {
    case ' ':
      e.preventDefault();
      togglePlayback();
      break;
    case 'x':
      toggleMirror();
      break;
    case 'a':
    case '[':
      setLoopIn();
      break;
    case 'b':
    case ']':
      setLoopOut();
      break;
    case 'm':
      createCuePoint();
      break;
    case 'arrowleft':
      dom.video.currentTime = Math.max(0, dom.video.currentTime - 2);
      break;
    case 'arrowright':
      dom.video.currentTime = Math.min(dom.video.duration || 0, dom.video.currentTime + 2);
      break;
  }
});

renderStageCanvas();