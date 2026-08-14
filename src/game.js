// 4~5단계: 진행 게이지 + 타이머 + 완료 + 상자 획득.
//
// 핵심 규칙: 게이지는 "양치 중"일 때만 찬다. 멈추면 게이지도 멈춘다.
// 그래서 아이가 실제로 닦은 시간만 카운트된다 — 화면 앞에 서 있기만 해선 안 채워진다.

export const DURATION_MS = 20_000; // 개발용. 실제 배포는 2분(120_000)
const FULL_STREAK_MS = 3000; // 이보다 오래 멈추면 "안 멈추고 완주" 실패

/**
 * 상자 등급은 순수 랜덤이 아니라 양치의 질에 연동된다 (도박성 배제).
 * 꽝은 없다 — 완주하면 최소 실버는 보장.
 */
function gradeFor({ longestPause }) {
  if (longestPause < FULL_STREAK_MS) {
    return { id: 'gold', name: '골드박스', emoji: '🟨', reason: '중간에 멈추지 않고 완주!' };
  }
  return { id: 'silver', name: '실버박스', emoji: '⬜', reason: '양치 완료!' };
}

export function createGame() {
  let elapsedMs = 0;
  let done = false;
  let pausedSince = 0;
  let longestPause = 0;
  let box = null;

  return {
    update(brushing, dtMs, now) {
      if (done) return;

      if (brushing) {
        if (pausedSince) {
          longestPause = Math.max(longestPause, now - pausedSince);
          pausedSince = 0;
        }
        elapsedMs = Math.min(elapsedMs + dtMs, DURATION_MS);
        if (elapsedMs >= DURATION_MS) {
          done = true;
          box = gradeFor({ longestPause });
        }
      } else if (elapsedMs > 0 && !pausedSince) {
        // 시작 전 대기는 멈춤으로 치지 않는다. 한 번이라도 닦기 시작한 뒤부터 잰다.
        pausedSince = now;
      }
    },

    get progress() {
      return elapsedMs / DURATION_MS;
    },
    get elapsedMs() {
      return elapsedMs;
    },
    get done() {
      return done;
    },
    get box() {
      return box;
    },

    reset() {
      elapsedMs = 0;
      done = false;
      pausedSince = 0;
      longestPause = 0;
      box = null;
    },
  };
}
