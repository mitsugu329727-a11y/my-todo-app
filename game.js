'use strict';

// ── Web Audio ────────────────────────────────────────────────────────────────
let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

// Sine wave note: freq (Hz), duration (s), volume 0-1
function playNote(freq, duration = 0.22, vol = 0.28) {
  try {
    const ctx = getCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (_) {}
}

// Short descending buzz for game-over
function playError() {
  try {
    const ctx = getCtx();
    [220, 180, 140].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.09;
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  } catch (_) {}
}

// ── Constants ────────────────────────────────────────────────────────────────
const TILE_NOTES  = [261.6, 329.6, 392.0, 523.3]; // C4 E4 G4 C5
const STORAGE_KEY = 'echo-best-v1';

// Timing (ms): flash on, inter-tile gap — both shrink as level rises
const flashDuration = (level) => Math.max(280, 620 - (level - 1) * 28);
const interGap      = (level) => Math.max(100, 220 - (level - 1) * 10);

// ── State ────────────────────────────────────────────────────────────────────
let sequence   = [];
let playerIdx  = 0;
let isSequence = false;  // true while CPU is playing sequence
let score      = 0;
let level      = 1;
let best       = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);

// ── DOM ──────────────────────────────────────────────────────────────────────
const board       = document.getElementById('board');
const tiles       = Array.from(document.querySelectorAll('.tile'));
const overlay     = document.getElementById('overlay');
const overlayHead = document.getElementById('overlay-heading');
const overlayEye  = document.getElementById('overlay-eyebrow');
const overlaySub  = document.getElementById('overlay-sub');
const actionBtn   = document.getElementById('action-btn');
const scoreEl     = document.getElementById('score');
const levelEl     = document.getElementById('level');
const bestEl      = document.getElementById('best');
const statusEl    = document.getElementById('status-msg');

bestEl.textContent = best;

// ── Helpers ──────────────────────────────────────────────────────────────────
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function setTilesEnabled(on) {
  tiles.forEach((t) => { t.disabled = !on; });
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

function popScore(val) {
  scoreEl.textContent = val;
  scoreEl.classList.remove('pop');
  void scoreEl.offsetWidth; // reflow
  scoreEl.classList.add('pop');
  scoreEl.addEventListener('transitionend', () => scoreEl.classList.remove('pop'), { once: true });
}

// Light a tile for a given duration (returns Promise)
function flashTile(idx, duration) {
  return new Promise((resolve) => {
    const tile = tiles[idx];
    tile.classList.add('lit');
    playNote(TILE_NOTES[idx], duration / 1000);
    setTimeout(() => { tile.classList.remove('lit'); resolve(); }, duration);
  });
}

// ── Game flow ─────────────────────────────────────────────────────────────────
async function playSequence() {
  isSequence = true;
  setTilesEnabled(false);
  setStatus('見ていてください…');

  const fd = flashDuration(level);
  const ig = interGap(level);

  for (const idx of sequence) {
    await flashTile(idx, fd);
    await delay(ig);
  }

  setTilesEnabled(true);
  isSequence = false;
  playerIdx = 0;
  setStatus('あなたの番！');
}

async function nextRound() {
  levelEl.textContent = level;
  sequence.push(Math.floor(Math.random() * 4));
  await delay(500);
  await playSequence();
}

function startGame() {
  sequence  = [];
  playerIdx = 0;
  score     = 0;
  level     = 1;
  scoreEl.textContent = 0;
  levelEl.textContent = 1;

  overlay.classList.add('hidden');
  nextRound();
}

async function handleTileClick(idx) {
  if (isSequence) return;

  // Flash the clicked tile immediately for feedback
  flashTile(idx, 220);

  if (idx !== sequence[playerIdx]) {
    await triggerGameOver();
    return;
  }

  playerIdx++;

  if (playerIdx === sequence.length) {
    // Round complete
    score += level * 10;
    popScore(score);
    level++;
    setStatus('正解！');
    setTilesEnabled(false);
    await delay(700);
    nextRound();
  }
}

async function triggerGameOver() {
  isSequence = true;
  setTilesEnabled(false);
  playError();
  setStatus('ミス！');

  // Flash all tiles red
  tiles.forEach((t) => t.classList.add('error'));
  board.classList.add('shake');
  await delay(500);
  tiles.forEach((t) => t.classList.remove('error'));
  board.addEventListener('animationend', () => board.classList.remove('shake'), { once: true });

  // Update best
  if (score > best) {
    best = score;
    localStorage.setItem(STORAGE_KEY, best);
    bestEl.textContent = best;
  }

  showOverlay('ゲームオーバー', `スコア: ${score}`, score === best && score > 0 ? '新記録！' : '', 'もう一度');
}

function showOverlay(heading, eyebrow, sub, btnLabel) {
  overlayHead.textContent = heading;
  overlayEye.textContent  = eyebrow;
  overlaySub.textContent  = sub;
  actionBtn.textContent   = btnLabel;
  overlay.classList.remove('hidden');
  isSequence = false;
}

// ── Event listeners ───────────────────────────────────────────────────────────
actionBtn.addEventListener('click', startGame);

tiles.forEach((tile, i) => {
  tile.addEventListener('click', () => handleTileClick(i));
  // Touch: prevent double-fire on mobile
  tile.addEventListener('touchstart', (e) => { e.preventDefault(); handleTileClick(i); }, { passive: false });
});
