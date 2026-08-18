import { FaceLandmarker, HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { loadArt } from './assets.js';
import { createAudio } from './audio.js';
import { createBrushDetector, BRUSH_THRESHOLD } from './brushDetector.js';
import { createEffects } from './effects.js';
import { createFilter } from './filter.js';
import { createGame, DURATION_MS } from './game.js';
import { pickItem } from './rewards.js';

const $ = (id) => document.getElementById(id);

const audio = createAudio();

// 소리 끄기. 아이가 눌러도 게임은 그대로 돌아가야 하므로 오디오 외에는 아무것도 건드리지 않는다.
const muteBtn = $('mute');
const muteIcon = $('mute-icon');

function syncMuteButton() {
  const off = audio.muted;
  muteIcon.textContent = off ? '🔇' : '🔊';
  muteBtn.setAttribute('aria-pressed', String(off));
  muteBtn.setAttribute('aria-label', off ? '소리 켜기' : '소리 끄기');
}

muteBtn.addEventListener('click', () => {
  audio.toggleMuted();
  // 음소거 상태에서 소리를 켜면 그 클릭이 곧 자동재생 해제 제스처가 된다.
  if (!audio.muted) {
    audio.unlock();
    audio.startBgm();
  }
  syncMuteButton();
});

syncMuteButton(); // 지난번에 꺼둔 채로 새로고침했을 수 있다

// 랜딩부터 음악이 흐른다. 시작 버튼을 누르기 전에도 "지금 노는 기계"로 보여야
// 지나가던 아이가 멈춰 선다 — 조용한 화면은 꺼진 화면과 구별이 안 된다.
// 자동재생이 막히면 첫 터치에 알아서 다시 붙는다 (audio.js의 arm 참고).
audio.arm();

const video = $('webcam');
const canvas = $('overlay');
const ctx = canvas.getContext('2d');
const gaugeFill = $('gauge-fill');
const gaugeEl = $('gauge');
const worldEl = $('world');
const stageEl = $('stage');
const flowCanvas = $('flow');
const flowCtx = flowCanvas.getContext('2d');
const startEl = $('start');
const startBtn = $('start-btn');
const startIcon = $('start-icon');
const completeEl = $('complete');
const boxImg = $('box-img');
const itemEl = $('item');
const itemEmojiEl = $('item-emoji');
const itemNameEl = $('item-name');
const restartBtn = $('restart');
const nudgeBrush = $('nudge-brush');

// 멈춘 지 이만큼 지나면 칫솔이 올라온다. 짧으면 잠깐 숨 고르는 것까지 잔소리가 되고,
// 길면 아이가 이미 딴짓으로 넘어간 뒤다.
const NUDGE_AFTER_MS = 5000;

const devEl = $('dev');
const statusEl = $('status');
const brushEl = $('brush-status');
const gaugeTime = $('gauge-time');
const debugEl = $('debug');

// 아이한테 보여줄 땐 개발 정보가 방해된다. 기본은 숨김.
// 폰에는 키보드가 없으므로 상단 마스코트를 세 번 두드리는 길도 열어둔다.
window.addEventListener('keydown', (e) => {
  if (e.key === 'd' || e.key === 'D') devEl.classList.toggle('hidden');
});

let taps = [];
$('hud-mascot').addEventListener('click', () => {
  const now = Date.now();
  taps = [...taps, now].filter((t) => now - t < 1200);
  if (taps.length >= 3) {
    taps = [];
    devEl.classList.toggle('hidden');
  }
});

// 루프가 죽으면 화면은 멀쩡한데 아무것도 안 움직인다. 원인을 화면에 띄운다.
function fail(msg) {
  devEl.classList.remove('hidden');
  debugEl.textContent = msg;
}

function setStatus(el, text, on) {
  el.textContent = text;
  el.className = on ? 'on' : 'off';
}

function formatTime(ms) {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// wasm과 모델 모두 public/에서 서빙한다. 영상은 브라우저 밖으로 나가지 않는다.
// 폰·저사양 기기는 GPU 델리게이트가 없을 수 있으므로 CPU로 물러난다.
let delegateUsed = 'GPU';
let filesetPromise = null;

async function createFaceLandmarkerOn(delegate) {
  filesetPromise ??= FilesetResolver.forVisionTasks('/wasm');
  return FaceLandmarker.createFromOptions(await filesetPromise, {
    baseOptions: { modelAssetPath: '/models/face_landmarker.task', delegate },
    runningMode: 'VIDEO',
    numFaces: 1,
  });
}

async function createFaceLandmarker() {
  try {
    return await createFaceLandmarkerOn('GPU');
  } catch {
    delegateUsed = 'CPU';
    return createFaceLandmarkerOn('CPU');
  }
}

// 손은 "입 근처에 있는가"만 보면 되므로 GPU/CPU 전환 없이 한 번만 만든다.
async function createHandLandmarker() {
  filesetPromise ??= FilesetResolver.forVisionTasks('/wasm');
  const options = {
    baseOptions: { modelAssetPath: '/models/hand_landmarker.task', delegate: 'GPU' },
    runningMode: 'VIDEO',
    numHands: 2,
  };
  try {
    return await HandLandmarker.createFromOptions(await filesetPromise, options);
  } catch {
    options.baseOptions.delegate = 'CPU';
    return HandLandmarker.createFromOptions(await filesetPromise, options);
  }
}

// 시작 버튼을 누르기 전엔 카메라를 켜지 않는다.
// facingMode는 태블릿·폰에서 후면 카메라가 잡히는 걸 막는다.
async function startWebcam() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  video.srcObject = stream;

  // loadeddata 시점에 videoWidth가 아직 0인 기기가 있다.
  // 0으로 캔버스를 만들면 아무것도 안 그려지고 detectForVideo도 터진다.
  await new Promise((resolve) => {
    if (video.readyState >= 2 && video.videoWidth > 0) return resolve();
    video.addEventListener('loadedmetadata', resolve, { once: true });
  });
  await video.play().catch(() => {}); // iOS는 명시적 play가 필요할 때가 있다

  for (let i = 0; i < 40 && !video.videoWidth; i++) {
    await new Promise((r) => requestAnimationFrame(r));
  }
  if (!video.videoWidth) throw new Error('카메라 해상도를 못 읽음');
}

async function main() {
  let art;
  let faceLandmarker;
  let handLandmarker;
  try {
    // 모델과 그림을 미리 받아둔다. 시작 버튼을 누르는 순간 바로 시작되게.
    [art, faceLandmarker, handLandmarker] = await Promise.all([
      loadArt(),
      createFaceLandmarker(),
      createHandLandmarker(),
    ]);
  } catch (err) {
    startIcon.textContent = '!';
    setStatus(statusEl, `로드 실패: ${err.message}`, false);
    devEl.classList.remove('hidden');
    throw err;
  }

  startBtn.disabled = false;
  startIcon.textContent = '▶';

  // 소리는 제스처 핸들러 "안에서" 시작해야 한다. 아래 startWebcam()을 await한 뒤에
  // 재생하면 Safari가 제스처와 무관한 재생으로 보고 막는다.
  startBtn.addEventListener(
    'click',
    () => {
      audio.unlock();
      audio.startBgm();
    },
    { once: true },
  );

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

  // 폰은 회전하면 해상도가 바뀐다. 매 프레임 확인해서 캔버스를 맞춘다.
  function syncCanvas() {
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // 거품 층은 화면(CSS) 픽셀로 그린다. 게이지 위치도 CSS 픽셀이라 좌표계가 하나로 맞는다.
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(worldEl.clientWidth * dpr);
    const h = Math.round(worldEl.clientHeight * dpr);
    if (flowCanvas.width !== w || flowCanvas.height !== h) {
      flowCanvas.width = w;
      flowCanvas.height = h;
    }
    flowCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  syncCanvas();

  // 오버레이는 object-fit: cover + scaleX(-1)이다. 랜드마크의 정규화 좌표를
  // 눈에 보이는 위치로 되돌린다 — 여기가 어긋나면 거품이 입이 아닌 엉뚱한 곳에서
  // 튀어나오고, 칫솔도 얼굴을 빗나간다.
  function videoPointToStage(nx, ny) {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return null;
    const stage = stageEl.getBoundingClientRect();
    const scale = Math.max(stage.width / vw, stage.height / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    return {
      x: (stage.width - dw) / 2 + (1 - nx) * dw, // 거울이라 x를 뒤집는다
      y: (stage.height - dh) / 2 + ny * dh,
    };
  }

  // 거품이 날아가는 층(#flow)은 #world 기준이라 무대 오프셋을 더해준다.
  function videoPointToWorld(nx, ny) {
    const p = videoPointToStage(nx, ny);
    if (!p) return null;
    const world = worldEl.getBoundingClientRect();
    const stage = stageEl.getBoundingClientRect();
    return { x: stage.left - world.left + p.x, y: stage.top - world.top + p.y };
  }

  // 채워지는 끝단. 거품은 "지금 차오르는 지점"으로 빨려들어야 인과가 보인다.
  function gaugeEdgeInWorld() {
    const world = worldEl.getBoundingClientRect();
    const gauge = gaugeEl.getBoundingClientRect();
    const fill = gaugeFill.getBoundingClientRect();
    return {
      x: Math.min(Math.max(fill.right, gauge.left + 8), gauge.right - 8) - world.left,
      y: gauge.top + gauge.height / 2 - world.top,
    };
  }

  // 칫솔은 화면 아래가 아니라 입 옆으로 올라온다. 아래에 떠 있으면 "저기 칫솔이 있네"로
  // 끝나지만, 입 옆에 오면 "여기다 대"가 된다. 솔 끝(이미지의 왼쪽 위)을 입에 맞춘다.
  let nudgeX = null;
  let nudgeY = null;
  let nudgeW = null;

  function placeNudge(landmarks, snap) {
    const stage = stageEl.getBoundingClientRect();
    // 얼굴을 못 찾는 동안엔 아래 가운데. 어디에 대라고 짚어줄 수가 없으니 그냥 보여만 준다.
    let tx = stage.width / 2;
    let ty = stage.height * 0.72;
    let tw = stage.width * 0.32;

    const mouth = landmarks?.[13];
    const cheekL = landmarks?.[234];
    const cheekR = landmarks?.[454];
    if (mouth && cheekL && cheekR) {
      const m = videoPointToStage(mouth.x, mouth.y);
      const a = videoPointToStage(cheekL.x, cheekL.y);
      const b = videoPointToStage(cheekR.x, cheekR.y);
      if (m && a && b) {
        const faceW = Math.hypot(b.x - a.x, b.y - a.y);
        // 입 정중앙에 얹으면 얼굴을 가린다. 볼 쪽으로 살짝 비켜 세운다.
        tx = m.x + faceW * 0.18;
        ty = m.y + faceW * 0.04;
        tw = faceW * 1.25;
      }
    }

    // 얼굴 추적은 프레임마다 미세하게 떨린다. 그대로 붙이면 칫솔이 덜덜 떨려 보인다.
    const k = snap ? 1 : 0.18;
    nudgeX = nudgeX === null || snap ? tx : nudgeX + (tx - nudgeX) * k;
    nudgeY = nudgeY === null || snap ? ty : nudgeY + (ty - nudgeY) * k;
    nudgeW = nudgeW === null || snap ? tw : nudgeW + (tw - nudgeW) * k;

    nudgeBrush.style.left = `${nudgeX}px`;
    nudgeBrush.style.top = `${nudgeY}px`;
    nudgeBrush.style.width = `${nudgeW}px`;
  }

  const detector = createBrushDetector();
  const filter = createFilter(art);
  const effects = createEffects(art);
  const game = createGame();

  // 몰에서는 아이가 다시 오지 않는다. "다음 양치 때 열려요"가 성립하지 않으므로
  // 상자를 그 자리에서 열어준다.
  function showComplete() {
    // 배경음을 줄이고 그 자리에 완료음을 놓는다. 겹쳐 울리면 "띵"이 안 들린다.
    audio.fadeOutBgm();
    audio.ding();

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

  // "다시 하기"는 바로 다음 판을 시작하지 않는다. 몰에서는 지나가던 다른 아이가
  // 이어받을 수도 있으므로, 시작 화면(랜딩)으로 돌아가 다시 버튼을 누르게 한다.
  // 웹캠은 이미 켜져 있으므로 재요청 없이 화면만 되돌린다.
  function showLanding() {
    startBtn.disabled = false;
    startIcon.textContent = '▶';
    startEl.classList.remove('hidden');
    startBtn.addEventListener(
      'click',
      () => {
        audio.startBgm();
        startEl.classList.add('hidden');
      },
      { once: true },
    );
  }

  restartBtn.addEventListener('click', () => {
    // 완료 때 페이드로 꺼둔 음악을 랜딩과 함께 되살린다. 곡은 처음부터.
    audio.restartBgm();
    game.reset();
    idleMs = 0;
    nudgeX = nudgeY = nudgeW = null;
    effects.clear();
    completeEl.classList.add('hidden');
    showLanding();
  });

  let lastVideoTime = -1;
  let lastResult = null;
  let lastHandResult = null;
  let handFrameCount = 0;
  let lastFrameAt = performance.now();
  let lastTickAt = performance.now();
  let fps = 0;
  let brushing = false;
  let energy = 0;
  let handNear = false;
  let idleMs = 0; // 양치가 끊긴 시간. 칫솔을 올릴지 판단하는 데만 쓴다

  let reportedError = false;
  let detectFails = 0;
  let lastDetectError = '';
  let handDetectFails = 0;
  let swapping = false;

  // GPU 델리게이트가 계속 NaN을 뱉으면 CPU로 다시 만든다.
  // 만드는 동안은 검출을 건너뛴다 — 옛 인스턴스를 닫는 중에 부르면 또 터진다.
  function swapToCpu() {
    if (swapping) return;
    swapping = true;
    delegateUsed = 'CPU(전환중)';
    createFaceLandmarkerOn('CPU')
      .then((next) => {
        faceLandmarker.close?.();
        faceLandmarker = next;
        delegateUsed = 'CPU';
        detectFails = 0;
      })
      .catch((err) => fail(`CPU 전환 실패: ${err.message}`))
      .finally(() => {
        swapping = false;
      });
  }

  function loop() {
    try {
      tick();
    } catch (err) {
      // 예외가 여기서 안 잡히면 rAF 재호출까지 못 가서 루프가 통째로 죽는다.
      // 화면은 카메라 영상이라 멀쩡해 보이고 필터만 안 나온다 — 원인을 알 수가 없다.
      if (!reportedError) {
        reportedError = true;
        fail(`루프 오류: ${err.message}`);
      }
    }
    requestAnimationFrame(loop);
  }

  function tick() {
    const now = performance.now();
    const dtMs = Math.min(now - lastTickAt, 100); // 탭 전환 후 큰 점프로 게이지가 튀지 않게
    lastTickAt = now;
    syncCanvas();

    const ready =
      video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0 && !swapping;

    if (ready && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;

      // 한 프레임 실패로 루프를 죽이지 않는다.
      // 모바일에서는 "ROI contains NaN values"가 산발적으로 뜨는데,
      // 다음 프레임엔 멀쩡한 경우가 많다. 계속 실패하면 그때 CPU로 갈아탄다.
      try {
        lastResult = faceLandmarker.detectForVideo(video, now);
        detectFails = 0;
      } catch (err) {
        detectFails += 1;
        lastDetectError = err.message;
        if (detectFails >= 12 && delegateUsed === 'GPU') swapToCpu();
      }

      // 손 모델까지 매 프레임 돌리면 저사양 폰에서 부담이 크다. 한 프레임 걸러 돌리고
      // 그 사이엔 이전 결과를 유지한다 (brushDetector가 짧은 공백은 알아서 봐준다).
      handFrameCount += 1;
      if (handFrameCount % 2 === 0) {
        try {
          lastHandResult = handLandmarker.detectForVideo(video, now);
          handDetectFails = 0;
        } catch (err) {
          handDetectFails += 1;
        }
      }

      // 화면 비율을 넘겨야 노트북(가로)과 폰(세로)에서 같은 수치가 나온다.
      const aspect = canvas.height ? canvas.width / canvas.height : 1;
      ({ brushing, energy, handNear } = detector.update(
        lastResult?.faceLandmarks?.[0] ?? null,
        lastHandResult?.landmarks ?? [],
        now,
        aspect,
      ));

      // 프레임 간격을 지수 평활해서 FPS 표시가 튀지 않게 한다.
      fps = fps ? fps * 0.9 + (1000 / (now - lastFrameAt)) * 0.1 : 1000 / (now - lastFrameAt);
      lastFrameAt = now;
    }

    const landmarks = lastResult?.faceLandmarks?.[0];
    const wasDone = game.done;
    const active = !game.done && brushing;

    game.update(brushing, dtMs, now);
    filter.update(active, dtMs);

    const mouth = landmarks?.[13];
    const from = active && mouth ? videoPointToWorld(mouth.x, mouth.y) : null;
    effects.update(landmarks, active, dtMs, from ? { from, to: gaugeEdgeInWorld() } : null);

    if (!wasDone && game.done) showComplete();

    // 랜딩·완료 화면에서는 세지 않는다. 시작 버튼을 누르자마자 칫솔이 튀어나오면
    // 재촉이 아니라 방해가 된다.
    const playing = !game.done && startEl.classList.contains('hidden');
    idleMs = playing && !brushing ? idleMs + dtMs : 0;

    // 올라와 있는 동안만 따라다닌다. 숨어 있을 때 위치를 미리 잡아둬야
    // 나타나는 순간 엉뚱한 자리에서 미끄러져 오지 않는다.
    const nudgeUp = idleMs >= NUDGE_AFTER_MS;
    if (playing) placeNudge(landmarks, !nudgeUp);
    nudgeBrush.classList.toggle('up', nudgeUp);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    filter.draw(ctx, landmarks, canvas.width, canvas.height);
    effects.draw(ctx, canvas.width, canvas.height);

    flowCtx.clearRect(0, 0, worldEl.clientWidth, worldEl.clientHeight);
    effects.drawFlow(flowCtx);

    gaugeFill.style.width = `${game.progress * 100}%`;

    if (!devEl.classList.contains('hidden') && !reportedError) {
      gaugeTime.textContent = `${formatTime(game.elapsedMs)} / ${formatTime(DURATION_MS)}`;
      setStatus(statusEl, landmarks ? '얼굴 인식됨' : '얼굴 안 보임', Boolean(landmarks));
      setStatus(brushEl, brushing ? '양치 중' : '멈춤', brushing);
      debugEl.textContent =
        `움직임: ${energy.toFixed(2)}/${BRUSH_THRESHOLD.toFixed(2)}` +
        ` · 손: ${handNear ? '가까움' : '없음'}` +
        ` · FPS: ${fps.toFixed(0)} · ${delegateUsed}` +
        ` · video ${video.videoWidth}x${video.videoHeight}` +
        ` · canvas ${canvas.width}x${canvas.height}` +
        ` · art ${Object.keys(art).length}` +
        (detectFails ? ` · 검출실패 ${detectFails}회: ${lastDetectError.slice(0, 60)}` : '') +
        (handDetectFails ? ` · 손검출실패 ${handDetectFails}회` : '');
    }
  }

  loop();
}

main();
