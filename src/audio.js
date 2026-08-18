// 소리.
//
// 4~6세 대상이라 글자를 못 읽는다는 전제가 있고(style.css 참고), 그러면 남는 채널은
// 그림과 소리 둘뿐이다. 지금까지 소리 쪽이 통째로 비어 있었다.
//
// 브라우저 자동재생 정책상 사용자 제스처 없이는 아무 소리도 안 난다.
// 이 게임에서 보장된 제스처는 시작 버튼 클릭 하나뿐이므로, 그 순간 전부 열어둔다.

// 개발 중에는 같은 곡이 계속 흐르는 게 성가시다. 기본은 꺼둔 상태.
// 배포 전에 반드시 true로 되돌릴 것 — 켜고 끄는 법은 CLAUDE.md "배경 음악 켜고 끄기" 참고.
const BGM_ENABLED = false;

const BGM_SRC = '/audio/bgm.mp3';
const BGM_VOLUME = 0.45; // 배경음이 이보다 크면 몰 소음 속에서 "띵"이 묻힌다

// 완료음 "띵" — mp3를 하나 더 받는 대신 합성한다.
// 한 음짜리 소리에 파일을 붙이면 로딩 실패 지점만 늘고, 음정·길이를 여기서 바로
// 만질 수 있는 쪽이 튜닝에 낫다. 종소리로 들리게 하는 건 기음이 아니라 위 배음들이다.
const DING_PARTIALS = [
  { freq: 1318.5, gain: 0.5 }, // E6 (기음)
  { freq: 1975.5, gain: 0.22 }, // B6
  { freq: 2637.0, gain: 0.09 }, // E7
];
const DING_SEC = 1.6; // 여운. 짧으면 "딱"이 되고 길면 질질 끌린다
const MUTE_KEY = 'brush-game.muted';
const BGM_FADE_MS = 700; // 완료 시 배경음을 이만큼 걸쳐 줄인다 — 띵이 들릴 자리를 비운다

// 코드를 고치지 않고 한 판만 소리를 켜/꺼 보고 싶을 때가 있다: ?bgm=1 / ?bgm=0
function bgmEnabled() {
  const q = new URLSearchParams(location.search).get('bgm');
  if (q === '1') return true;
  if (q === '0') return false;
  return BGM_ENABLED;
}

export function createAudio() {
  const on = bgmEnabled();

  const bgm = new Audio();
  bgm.loop = true;
  bgm.preload = 'auto';
  bgm.volume = BGM_VOLUME;
  // 꺼져 있으면 src조차 걸지 않는다 — 개발 중에 1.4MB를 매 새로고침마다 받을 이유가 없다.
  if (on) bgm.src = BGM_SRC;

  let ctx = null;
  let fadeTimer = 0;
  let armed = false;

  // 매장에 따라 소리를 아예 못 트는 경우가 있다. 그때마다 운영자가 새로고침할 때마다
  // 다시 끄게 만들 수는 없으므로 이 설정만 기기에 남긴다.
  let muted = false;
  try {
    muted = localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    // 시크릿 모드 등에서 localStorage 접근 자체가 막힐 수 있다. 소리 설정 하나 때문에 앱이 죽으면 안 된다.
  }
  bgm.muted = muted;

  function stopFade() {
    if (fadeTimer) {
      clearInterval(fadeTimer);
      fadeTimer = 0;
    }
  }

  function unlockCtx() {
    if (!ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) ctx = new Ctx();
    }
    // iOS는 제스처 밖에서 만든 컨텍스트가 suspended로 남는다.
    ctx?.resume?.().catch(() => {});
  }

  function play() {
    stopFade();
    bgm.volume = BGM_VOLUME; // 완료 때 페이드로 0까지 내려가 있을 수 있다
    return bgm.play();
  }

  return {
    /** 반드시 사용자 제스처(클릭) 핸들러 안에서 부를 것. */
    unlock: unlockCtx,

    /**
     * 랜딩에서 바로 음악을 시작한다.
     *
     * 대부분의 브라우저는 제스처 없는 재생을 막으므로 이 시도는 실패할 수 있다.
     * 실패하면 화면 어디든 첫 터치에 다시 시도한다 — 시작 버튼을 누르기 전에
     * 아이가 화면을 한 번이라도 건드리면 그 순간부터 음악이 흐른다.
     * (키오스크라면 운영자가 아침에 한 번 누르는 것으로 끝난다. 그래도 확실히 하려면
     *  Chrome을 --autoplay-policy=no-user-gesture-required 로 띄우면 시도가 항상 통과한다.)
     */
    arm() {
      if (!on || armed) return;
      armed = true;
      play().catch(() => {
        const retry = () => {
          unlockCtx();
          play().catch(() => {});
        };
        for (const ev of ['pointerdown', 'touchstart', 'keydown']) {
          window.addEventListener(ev, retry, { once: true });
        }
      });
    },

    /** 이미 흐르고 있으면 건드리지 않는다 — 랜딩에서 게임으로 넘어갈 때 곡이 끊기면 안 된다. */
    startBgm() {
      if (!on) return;
      if (!bgm.paused) {
        stopFade();
        bgm.volume = BGM_VOLUME;
        return;
      }
      // 소리가 안 나는 게 게임을 멈출 이유는 아니다. 실패해도 조용히 넘어간다.
      play().catch(() => {});
    },

    /** 곡을 처음부터. 완료 후 랜딩으로 돌아갈 때 쓴다. */
    restartBgm() {
      if (!on) return;
      bgm.currentTime = 0;
      play().catch(() => {});
    },

    stopBgm() {
      stopFade();
      bgm.pause();
    },

    fadeOutBgm(ms = BGM_FADE_MS) {
      if (!on) return;
      stopFade();
      const step = 40;
      const drop = bgm.volume / Math.max(1, ms / step);
      fadeTimer = setInterval(() => {
        bgm.volume = Math.max(0, bgm.volume - drop);
        if (bgm.volume <= 0.001) {
          stopFade();
          bgm.pause();
        }
      }, step);
    },

    get muted() {
      return muted;
    },

    /** @returns {boolean} 바뀐 뒤의 음소거 상태 */
    toggleMuted() {
      muted = !muted;
      bgm.muted = muted;
      try {
        localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
      } catch {
        // 저장 못 해도 이번 세션에는 적용된다
      }
      return muted;
    },

    /** 완료음. */
    ding() {
      if (!ctx || muted) return;
      const t0 = ctx.currentTime + 0.02;

      for (const { freq, gain } of DING_PARTIALS) {
        const osc = ctx.createOscillator();
        const amp = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;

        // 종은 순간적으로 붙었다가 지수적으로 사라진다.
        // 0에서 시작/끝내면 exponentialRamp가 죽으므로 아주 작은 값을 쓴다.
        amp.gain.setValueAtTime(0.0001, t0);
        amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
        amp.gain.exponentialRampToValueAtTime(0.0001, t0 + DING_SEC);

        osc.connect(amp).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + DING_SEC + 0.05);
      }
    },
  };
}
