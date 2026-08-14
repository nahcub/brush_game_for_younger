import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { createBrushDetector, BRUSH_THRESHOLD, MOUTH_INDICES } from './brushDetector.js';
import { createEffects } from './effects.js';
import { createGame, DURATION_MS } from './game.js';
import { createLyrics } from './lyrics.js';
import { PREVIOUS_BOX, pickItem } from './rewards.js';

const video = document.getElementById('webcam');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const stage = document.getElementById('stage');
const statusEl = document.getElementById('status');
const brushEl = document.getElementById('brush-status');
const debugEl = document.getElementById('debug');
const gaugeFill = document.getElementById('gauge-fill');
const gaugeTime = document.getElementById('gauge-time');
const lyricsEl = document.getElementById('lyrics');
const startEl = document.getElementById('start');
const startBtn = document.getElementById('start-btn');
const completeEl = document.getElementById('complete');
const phaseOpenEl = document.getElementById('phase-open');
const phaseNewEl = document.getElementById('phase-new');
const openBoxEl = document.getElementById('open-box');
const openBtn = document.getElementById('open-btn');
const openItemEl = document.getElementById('open-item');
const itemEmojiEl = document.getElementById('item-emoji');
const itemNameEl = document.getElementById('item-name');
const boxEmojiEl = document.getElementById('box-emoji');
const boxNameEl = document.getElementById('box-name');
const boxReasonEl = document.getElementById('box-reason');
const restartBtn = document.getElementById('restart');

const mouthSet = new Set(MOUTH_INDICES);

// 개발 중엔 랜드마크가 보여야 튜닝이 되지만, 아이한테 보여줄 땐 방해된다. D키로 토글.
let showLandmarks = true;
window.addEventListener('keydown', (e) => {
  if (e.key === 'd' || e.key === 'D') showLandmarks = !showLandmarks;
});

function setStatus(el, text, on) {
  el.textContent = text;
  el.className = `status status--${on ? 'on' : 'off'}`;
}

function formatTime(ms) {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// wasm과 모델 모두 public/에서 서빙한다. 영상은 브라우저 밖으로 나가지 않는다.
async function createFaceLandmarker() {
  const fileset = await FilesetResolver.forVisionTasks('/wasm');
  return FaceLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: '/models/face_landmarker.task',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numFaces: 1,
  });
}

// 시작 버튼을 누르기 전엔 카메라를 켜지 않는다.
async function startWebcam() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 1280, height: 720 },
    audio: false,
  });
  video.srcObject = stream;
  await new Promise((resolve) => video.addEventListener('loadeddata', resolve, { once: true }));
}

// 신호에 쓰이는 입 주변 점은 다르게 칠한다. 튜닝할 때 어디를 보는지 알아야 한다.
function drawLandmarks(landmarks) {
  for (let i = 0; i < landmarks.length; i++) {
    const isMouth = mouthSet.has(i);
    ctx.fillStyle = isMouth ? '#f472b6' : '#4ade80';
    ctx.beginPath();
    ctx.arc(
      landmarks[i].x * canvas.width,
      landmarks[i].y * canvas.height,
      isMouth ? 2.5 : 1.5,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

// 오늘 딴 상자. 개봉은 다음 양치 때이므로 지금은 들고만 있는다.
let pendingBox = null;

// 완료 연출은 두 단계다.
// 1) 지난번 상자를 열어 아이템을 꺼내고 (보상)
// 2) 오늘 상자를 잠긴 채로 받는다 (다음 양치의 동기)
function showComplete(box) {
  pendingBox = box;
  openBoxEl.textContent = PREVIOUS_BOX.emoji;
  openBoxEl.className = 'complete__box';
  openItemEl.classList.add('hidden');
  openBtn.textContent = '상자 열기';
  openBtn.disabled = false;
  openBtn.onclick = openBox;
  phaseOpenEl.classList.remove('hidden');
  phaseNewEl.classList.add('hidden');
  completeEl.classList.remove('hidden');
}

function openBox() {
  openBtn.disabled = true;
  openBoxEl.className = 'complete__box complete__box--shaking';

  // 상자가 다 떨고 나면 터뜨리고 아이템을 꺼낸다.
  openBoxEl.addEventListener(
    'animationend',
    () => {
      openBoxEl.className = 'complete__box complete__box--burst';
      const item = pickItem();
      itemEmojiEl.textContent = item.emoji;
      itemNameEl.textContent = `${item.name} 획득!`;
      openItemEl.classList.remove('hidden');
      openBtn.textContent = '다음';
      openBtn.disabled = false;
      openBtn.onclick = showNewBox;
    },
    { once: true },
  );
}

function showNewBox() {
  boxEmojiEl.textContent = pendingBox.emoji;
  boxNameEl.textContent = `${pendingBox.name} 획득!`;
  boxReasonEl.textContent = pendingBox.reason;
  phaseOpenEl.classList.add('hidden');
  phaseNewEl.classList.remove('hidden');
  openBtn.onclick = null;
}

function setLyricLine(text) {
  lyricsEl.textContent = text;
  // 애니메이션을 다시 트리거하려면 클래스를 뗐다 붙이면서 리플로우를 강제해야 한다.
  lyricsEl.classList.remove('lyrics--pop');
  void lyricsEl.offsetWidth;
  lyricsEl.classList.add('lyrics--pop');
}

async function main() {
  let faceLandmarker;
  try {
    // 모델은 미리 로드한다. 시작 버튼을 누르는 순간 바로 시작되게.
    faceLandmarker = await createFaceLandmarker();
  } catch (err) {
    startBtn.textContent = `모델 로드 실패: ${err.message}`;
    throw err;
  }

  startBtn.disabled = false;
  startBtn.textContent = '시작하기';

  await new Promise((resolve) => startBtn.addEventListener('click', resolve, { once: true }));

  startBtn.disabled = true;
  startBtn.textContent = '카메라 준비 중…';
  try {
    await startWebcam();
  } catch (err) {
    startBtn.textContent = `카메라 실패: ${err.message}`;
    setStatus(statusEl, '카메라를 켤 수 없음', false);
    throw err;
  }
  startEl.classList.add('hidden');

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  stage.style.setProperty('--video-aspect', `${video.videoWidth} / ${video.videoHeight}`);

  const detector = createBrushDetector();
  const effects = createEffects();
  const game = createGame();
  const lyrics = createLyrics();

  restartBtn.addEventListener('click', () => {
    game.reset();
    lyrics.reset();
    setLyricLine(lyrics.line);
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
    effects.update(landmarks, active, dtMs);
    if (active && lyrics.update(dtMs)) setLyricLine(lyrics.line);

    if (!wasDone && game.done) showComplete(game.box);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (landmarks && showLandmarks) drawLandmarks(landmarks);
    effects.draw(ctx, canvas.width, canvas.height);

    gaugeFill.style.width = `${game.progress * 100}%`;
    gaugeTime.textContent = `${formatTime(game.elapsedMs)} / ${formatTime(DURATION_MS)}`;

    setStatus(statusEl, landmarks ? '얼굴 인식됨' : '얼굴 안 보임', Boolean(landmarks));
    setStatus(brushEl, brushing ? '양치 중' : '멈춤', brushing);
    debugEl.textContent =
      `움직임: ${energy.toFixed(2)} / 임계 ${BRUSH_THRESHOLD.toFixed(2)}` +
      ` · 판정: ${brushing ? 'BRUSHING' : 'IDLE'} · FPS: ${fps.toFixed(0)} · [D] 랜드마크 토글`;

    requestAnimationFrame(loop);
  }

  loop();
}

main();
