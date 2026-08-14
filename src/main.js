import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { loadArt } from './assets.js';
import { createBrushDetector, BRUSH_THRESHOLD } from './brushDetector.js';
import { createEffects } from './effects.js';
import { createFilter } from './filter.js';
import { createGame, DURATION_MS } from './game.js';
import { pickItem } from './rewards.js';

const $ = (id) => document.getElementById(id);

const video = $('webcam');
const canvas = $('overlay');
const ctx = canvas.getContext('2d');
const gaugeFill = $('gauge-fill');
const startEl = $('start');
const startBtn = $('start-btn');
const startIcon = $('start-icon');
const completeEl = $('complete');
const boxImg = $('box-img');
const itemEl = $('item');
const itemEmojiEl = $('item-emoji');
const itemNameEl = $('item-name');
const restartBtn = $('restart');

const devEl = $('dev');
const statusEl = $('status');
const brushEl = $('brush-status');
const gaugeTime = $('gauge-time');
const debugEl = $('debug');

// 아이한테 보여줄 땐 개발 정보가 방해된다. 기본은 숨김, D키로 토글.
window.addEventListener('keydown', (e) => {
  if (e.key === 'd' || e.key === 'D') devEl.classList.toggle('hidden');
});

function setStatus(el, text, on) {
  el.textContent = text;
  el.className = on ? 'on' : 'off';
}

function formatTime(ms) {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// wasm과 모델 모두 public/에서 서빙한다. 영상은 브라우저 밖으로 나가지 않는다.
async function createFaceLandmarker() {
  const fileset = await FilesetResolver.forVisionTasks('/wasm');
  return FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: '/models/face_landmarker.task', delegate: 'GPU' },
    runningMode: 'VIDEO',
    numFaces: 1,
  });
}

// 시작 버튼을 누르기 전엔 카메라를 켜지 않는다.
// facingMode는 태블릿에서 후면 카메라가 잡히는 걸 막는다.
async function startWebcam() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: 1280, height: 720 },
    audio: false,
  });
  video.srcObject = stream;
  await new Promise((resolve) => video.addEventListener('loadeddata', resolve, { once: true }));
}

async function main() {
  let art;
  let faceLandmarker;
  try {
    // 모델과 그림을 미리 받아둔다. 시작 버튼을 누르는 순간 바로 시작되게.
    [art, faceLandmarker] = await Promise.all([loadArt(), createFaceLandmarker()]);
  } catch (err) {
    startIcon.textContent = '!';
    setStatus(statusEl, `로드 실패: ${err.message}`, false);
    devEl.classList.remove('hidden');
    throw err;
  }

  startBtn.disabled = false;
  startIcon.textContent = '▶';

  await new Promise((resolve) => startBtn.addEventListener('click', resolve, { once: true }));

  startBtn.disabled = true;
  startIcon.textContent = '…';
  try {
    await startWebcam();
  } catch (err) {
    startIcon.textContent = '!';
    setStatus(statusEl, `카메라 실패: ${err.message}`, false);
    devEl.classList.remove('hidden');
    throw err;
  }
  startEl.classList.add('hidden');

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const detector = createBrushDetector();
  const filter = createFilter(art);
  const effects = createEffects(art);
  const game = createGame();

  // 몰에서는 아이가 다시 오지 않는다. "다음 양치 때 열려요"가 성립하지 않으므로
  // 상자를 그 자리에서 열어준다.
  function showComplete() {
    boxImg.src = '/art/box-closed.png';
    boxImg.className = '';
    boxImg.style.cursor = 'pointer';
    itemEl.classList.add('hidden');
    restartBtn.classList.add('hidden');
    completeEl.classList.remove('hidden');
  }

  function openBox() {
    if (boxImg.className) return; // 이미 여는 중이거나 열렸다
    boxImg.className = 'shaking';
    boxImg.addEventListener(
      'animationend',
      () => {
        boxImg.src = '/art/box-open.png';
        boxImg.className = 'opened';
        boxImg.style.cursor = 'default';
        const item = pickItem();
        itemEmojiEl.textContent = item.emoji;
        itemNameEl.textContent = item.name;
        itemEl.classList.remove('hidden');
        restartBtn.classList.remove('hidden');
      },
      { once: true },
    );
  }

  boxImg.addEventListener('click', openBox);

  restartBtn.addEventListener('click', () => {
    game.reset();
    effects.clear();
    completeEl.classList.add('hidden');
  });

  let lastVideoTime = -1;
  let lastResult = null;
  let lastFrameAt = performance.now();
  let lastTickAt = performance.now();
  let fps = 0;
  let brushing = false;
  let energy = 0;

  function loop() {
    const now = performance.now();
    const dtMs = Math.min(now - lastTickAt, 100); // 탭 전환 후 큰 점프로 게이지가 튀지 않게
    lastTickAt = now;

    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      lastResult = faceLandmarker.detectForVideo(video, now);
      ({ brushing, energy } = detector.update(lastResult?.faceLandmarks?.[0] ?? null, now));

      // 프레임 간격을 지수 평활해서 FPS 표시가 튀지 않게 한다.
      fps = fps ? fps * 0.9 + (1000 / (now - lastFrameAt)) * 0.1 : 1000 / (now - lastFrameAt);
      lastFrameAt = now;
    }

    const landmarks = lastResult?.faceLandmarks?.[0];
    const wasDone = game.done;
    const active = !game.done && brushing;

    game.update(brushing, dtMs, now);
    filter.update(active, dtMs);
    effects.update(landmarks, active, dtMs);

    if (!wasDone && game.done) showComplete();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    filter.draw(ctx, landmarks, canvas.width, canvas.height);
    effects.draw(ctx, canvas.width, canvas.height);

    gaugeFill.style.width = `${game.progress * 100}%`;

    if (!devEl.classList.contains('hidden')) {
      gaugeTime.textContent = `${formatTime(game.elapsedMs)} / ${formatTime(DURATION_MS)}`;
      setStatus(statusEl, landmarks ? '얼굴 인식됨' : '얼굴 안 보임', Boolean(landmarks));
      setStatus(brushEl, brushing ? '양치 중' : '멈춤', brushing);
      debugEl.textContent =
        `움직임: ${energy.toFixed(2)} / 임계 ${BRUSH_THRESHOLD.toFixed(2)}` +
        ` · 판정: ${brushing ? 'BRUSHING' : 'IDLE'} · FPS: ${fps.toFixed(0)}`;
    }

    requestAnimationFrame(loop);
  }

  loop();
}

main();
