const state = {
  isMirrored: false,
  loopA: null,
  loopB: null,
  bpm: 120,
  offset: 0,
  markers: [],
  dancers: [
    { id: 1, label: 'D1', x: 100, y: 120, color: '#10b981' },
    { id: 2, label: 'D2', x: 160, y: 90,  color: '#38bdf8' },
    { id: 3, label: 'D3', x: 220, y: 120, color: '#f59e0b' }
  ],
  draggingDancer: null
};

// Elementos do DOM
const video = document.getElementById('danceVideo');
const videoUpload = document.getElementById('videoUpload');
const emptyState = document.getElementById('emptyState');
const mirrorBadge = document.getElementById('mirrorBadge');
const playPauseBtn = document.getElementById('playPauseBtn');
const mirrorBtn = document.getElementById('mirrorBtn');
const setABtn = document.getElementById('setABtn');
const setBBtn = document.getElementById('setBBtn');
const clearLoopBtn = document.getElementById('clearLoopBtn');
const speedSelect = document.getElementById('speedSelect');
const timelineTrack = document.getElementById('timelineTrack');
const timelineProgress = document.getElementById('timelineProgress');
const loopRegion = document.getElementById('loopRegion');
const markersLayer = document.getElementById('markersLayer');
const markersList = document.getElementById('markersList');
const markerNameInput = document.getElementById('markerNameInput');
const addMarkerBtn = document.getElementById('addMarkerBtn');
const currentTimeText = document.getElementById('currentTimeText');
const durationText = document.getElementById('durationText');
const loopStatusText = document.getElementById('loopStatusText');
const bpmInput = document.getElementById('bpmInput');
const offsetInput = document.getElementById('offsetInput');
const setOffsetBtn = document.getElementById('setOffsetBtn');
const beats = document.querySelectorAll('.beat');

// 1. Upload de Vídeo Local
videoUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  video.src = url;
  emptyState.hidden = true;
  video.load();
});

// 2. Controles de Reprodução & Espelhamento
function togglePlay() {
  if (!video.src) return;
  if (video.paused) {
    video.play();
    playPauseBtn.textContent = 'Pause';
  } else {
    video.pause();
    playPauseBtn.textContent = 'Play';
  }
}

function toggleMirror() {
  state.isMirrored = !state.isMirrored;
  video.classList.toggle('mirrored', state.isMirrored);
  mirrorBadge.hidden = !state.isMirrored;
}

playPauseBtn.addEventListener('click', togglePlay);
mirrorBtn.addEventListener('click', toggleMirror);

speedSelect.addEventListener('change', (e) => {
  video.playbackRate = parseFloat(e.target.value);
});

// 3. Sistema de Loop A-B
function setLoopPointA() {
  if (!video.duration) return;
  state.loopA = video.currentTime;
  if (state.loopB !== null && state.loopB <= state.loopA) {
    state.loopB = null;
  }
  updateLoopUI();
}

function setLoopPointB() {
  if (!video.duration || state.loopA === null) return;
  if (video.currentTime > state.loopA) {
    state.loopB = video.currentTime;
    updateLoopUI();
  }
}

function clearLoop() {
  state.loopA = null;
  state.loopB = null;
  updateLoopUI();
}

function updateLoopUI() {
  if (state.loopA !== null && state.loopB !== null && video.duration) {
    const startPct = (state.loopA / video.duration) * 100;
    const widthPct = ((state.loopB - state.loopA) / video.duration) * 100;
    loopRegion.style.left = `${startPct}%`;
    loopRegion.style.width = `${widthPct}%`;
    loopRegion.hidden = false;
    loopStatusText.textContent = `Loop: ${formatTime(state.loopA)} ➔ ${formatTime(state.loopB)}`;
  } else if (state.loopA !== null) {
    loopRegion.hidden = true;
    loopStatusText.textContent = `Loop A: ${formatTime(state.loopA)} (defina B)`;
  } else {
    loopRegion.hidden = true;
    loopStatusText.textContent = 'Loop: OFF';
  }
}

setABtn.addEventListener('click', setLoopPointA);
setBBtn.addEventListener('click', setLoopPointB);
clearLoopBtn.addEventListener('click', clearLoop);

// 4. Loop de Sincronização (Timeline + Loop A-B + Metrônomo 8-Count)
function syncLoop() {
  if (video.duration) {
    // Checagem do Loop A-B
    if (state.loopA !== null && state.loopB !== null && video.currentTime >= state.loopB) {
      video.currentTime = state.loopA;
    }

    // Progresso da Timeline
    const pct = (video.currentTime / video.duration) * 100;
    timelineProgress.style.width = `${pct}%`;
    currentTimeText.textContent = formatTime(video.currentTime);

    // Cálculo do 8-Count
    const elapsed = video.currentTime - state.offset;
    if (elapsed >= 0) {
      const secondsPerBeat = 60 / state.bpm;
      const currentBeatIndex = Math.floor(elapsed / secondsPerBeat) % 8; // 0 a 7
      beats.forEach((el, idx) => {
        el.classList.toggle('active', idx === currentBeatIndex);
      });
    } else {
      beats.forEach((el) => el.classList.remove('active'));
    }
  }
  requestAnimationFrame(syncLoop);
}
requestAnimationFrame(syncLoop);

video.addEventListener('loadedmetadata', () => {
  durationText.textContent = formatTime(video.duration);
  renderMarkers();
  updateLoopUI();
});

timelineTrack.addEventListener('click', (e) => {
  if (!video.duration) return;
  const rect = timelineTrack.getBoundingClientRect();
  const clickRatio = (e.clientX - rect.left) / rect.width;
  video.currentTime = clickRatio * video.duration;
});

// 5. Metrônomo BPM e Offset
bpmInput.addEventListener('input', (e) => {
  state.bpm = Math.max(40, parseFloat(e.target.value) || 120);
});

offsetInput.addEventListener('input', (e) => {
  state.offset = parseFloat(e.target.value) || 0;
});

setOffsetBtn.addEventListener('click', () => {
  state.offset = parseFloat(video.currentTime.toFixed(2));
  offsetInput.value = state.offset;
});

// 6. Marcadores + Snapshot de Formação do Palco
function addMarker() {
  if (!video.duration) return;
  const name = markerNameInput.value.trim() || `Trecho ${state.markers.length + 1}`;
  const snapshot = JSON.parse(JSON.stringify(state.dancers));
  state.markers.push({
    id: Date.now(),
    name,
    time: video.currentTime,
    formation: snapshot
  });
  state.markers.sort((a, b) => a.time - b.time);
  markerNameInput.value = '';
  renderMarkers();
}

function renderMarkers() {
  markersLayer.innerHTML = '';
  markersList.innerHTML = '';
  if (!video.duration) return;

  state.markers.forEach((m) => {
    // Pino na barra de progresso
    const pin = document.createElement('div');
    pin.className = 'marker-pin';
    pin.style.left = `${(m.time / video.duration) * 100}%`;
    markersLayer.appendChild(pin);

    // Item na lista lateral
    const li = document.createElement('li');
    li.className = 'marker-item';
    li.innerHTML = `
      <span><strong>${m.name}</strong></span>
      <span>${formatTime(m.time)}</span>
    `;
    li.addEventListener('click', () => {
      video.currentTime = m.time;
      // Restaura a formação salva naquele marcador
      state.dancers = JSON.parse(JSON.stringify(m.formation));
      drawStage();
    });
    markersList.appendChild(li);
  });
}

addMarkerBtn.addEventListener('click', addMarker);

// 7. Stage Grid (HTML5 Canvas)
const canvas = document.getElementById('stageCanvas');
const ctx = canvas.getContext('2d');

function drawStage() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Linhas de grade do palco
  ctx.strokeStyle = '#132347';
  ctx.lineWidth = 1;
  const step = 40;
  for (let x = step; x < canvas.width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = step; y < canvas.height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Indicador de Frente do Palco (Espelho / Público)
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 10px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('▼ FRENTE DO PALCO / ESPELHO ▼', canvas.width / 2, canvas.height - 8);

  // Desenhar Pinos dos Dançarinos
  state.dancers.forEach((d) => {
    ctx.beginPath();
    ctx.arc(d.x, d.y, 14, 0, Math.PI * 2);
    ctx.fillStyle = d.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#030b1f';
    ctx.stroke();

    ctx.fillStyle = '#030b1f';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText(d.label, d.x, d.y + 4);
  });
}

canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

  for (let i = state.dancers.length - 1; i >= 0; i--) {
    const d = state.dancers[i];
    const dist = Math.hypot(mouseX - d.x, mouseY - d.y);
    if (dist <= 16) {
      state.draggingDancer = d;
      break;
    }
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (!state.draggingDancer) return;
  const rect = canvas.getBoundingClientRect();
  state.draggingDancer.x = Math.max(16, Math.min(canvas.width - 16, (e.clientX - rect.left) * (canvas.width / rect.width)));
  state.draggingDancer.y = Math.max(16, Math.min(canvas.height - 24, (e.clientY - rect.top) * (canvas.height / rect.height)));
  drawStage();
});

window.addEventListener('mouseup', () => {
  state.draggingDancer = null;
});

document.getElementById('addDancerBtn').addEventListener('click', () => {
  const id = state.dancers.length + 1;
  const palette = ['#10b981', '#38bdf8', '#f59e0b', '#ec4899', '#a855f7', '#eab308'];
  state.dancers.push({
    id,
    label: `D${id}`,
    x: 60 + ((id * 35) % 200),
    y: 110,
    color: palette[(id - 1) % palette.length]
  });
  drawStage();
});

document.getElementById('resetStageBtn').addEventListener('click', () => {
  state.dancers.forEach((d, idx) => {
    d.x = 70 + idx * 60;
    d.y = 120;
  });
  drawStage();
});

// 8. Atalhos de Teclado Globais
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;

  switch (e.key.toLowerCase()) {
    case ' ':
      e.preventDefault();
      togglePlay();
      break;
    case 'x':
      toggleMirror();
      break;
    case 'a':
    case '[':
      setLoopPointA();
      break;
    case 'b':
    case ']':
      setLoopPointB();
      break;
    case 'm':
      addMarker();
      break;
    case 'arrowleft':
      video.currentTime = Math.max(0, video.currentTime - 2);
      break;
    case 'arrowright':
      video.currentTime = Math.min(video.duration || 0, video.currentTime + 2);
      break;
  }
});

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toFixed(1).padStart(4, '0');
  return `${m}:${s}`;
}

drawStage();