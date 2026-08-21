// 4~5단계: 진행 게이지 + 타이머 + 완료 + 상자 획득.
//
// 핵심 규칙: 게이지는 "양치 중"일 때만 찬다. 멈추면 게이지도 멈춘다.
// 그래서 아이가 실제로 닦은 시간만 카운트된다 — 화면 앞에 서 있기만 해선 안 채워진다.
//
// 구역(사분면): 입안을 네 칸으로 나눠 한 칸씩 순서대로 닦게 한다. 게이지는 한 칸이
// 끝날 때마다 가득 찼다가 0으로 돌아가고, 네 번 채우면 끝난다. 칸을 쪼갠 게이지 대신
// "네 번 채운다"로 간 건, 아이에게는 짧은 목표가 반복되는 쪽이 긴 막대 하나보다 읽기
// 쉽기 때문이다. 어느 칸을 닦는지는 화면의 칫솔 위치로만 지시한다(main.js QUADRANTS).
//
// 주의: 검출기는 "닦는 중이냐"만 판정할 뿐 어느 칸을 닦는지 모른다(설계상 의도).
// 그래서 칸 전환은 실제 위치가 아니라 "누적 양치 시간"으로만 넘어간다 — 유도이지 채점이 아니다.

export const QUADRANT_COUNT = 4;
export const DURATION_MS = 20_000; // 개발용. 실제 배포는 2분(120_000) — 네 칸의 합
export const QUADRANT_MS = DURATION_MS / QUADRANT_COUNT;
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
  let elapsedMs = 0; // 전체 누적. 표시·기록용
  let quadrantMs = 0; // 현재 칸에서 채운 시간. 게이지는 이걸 본다
  let quadrant = 0;
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
        quadrantMs += dtMs;

        // 프레임이 길게 튀어도 한 번에 두 칸을 건너뛰지 않게 while로 접는다.
        while (quadrantMs >= QUADRANT_MS) {
          if (quadrant >= QUADRANT_COUNT - 1) {
            quadrantMs = QUADRANT_MS; // 마지막 칸은 가득 찬 채로 멈춘다
            done = true;
            box = gradeFor({ longestPause });
            break;
          }
          quadrantMs -= QUADRANT_MS;
          quadrant += 1;
        }
      } else if (elapsedMs > 0 && !pausedSince) {
        // 시작 전 대기는 멈춤으로 치지 않는다. 한 번이라도 닦기 시작한 뒤부터 잰다.
        pausedSince = now;
      }
    },

    /** 현재 칸의 진행도(0~1). 칸이 넘어가면 0으로 돌아간다. */
    get progress() {
      return quadrantMs / QUADRANT_MS;
    },
    /** 지금 닦을 칸의 번호(0~3). 바뀌는 순간이 곧 마스코트가 나올 순간이다. */
    get quadrant() {
      return quadrant;
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
      quadrantMs = 0;
      quadrant = 0;
      done = false;
      pausedSince = 0;
      longestPause = 0;
      box = null;
    },
  };
}
