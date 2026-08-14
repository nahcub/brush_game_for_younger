// "지금 양치 중인가 / 아닌가" 이진 판정.
// 어느 이를 닦는지는 판정하지 않는다 — 게임을 진행시키는 트리거일 뿐이다.
//
// 신호: 입/하관 랜드마크의 움직임 에너지.
//  - 머리 전체 움직임(고개 돌리기, 몸 흔들기)은 빼낸다. 안 그러면 양치와 구분이 안 된다.
//  - 얼굴 크기로 나눈다. 카메라에서 멀어져도 같은 수치가 나오게.
//  - 시간으로 나눈다. FPS가 흔들려도 같은 수치가 나오게.

// ---- 튜닝 상수 (웹캠 디버그 수치 보면서 조정) ----
export const BRUSH_THRESHOLD = 0.45; // 얼굴폭/초. 이 위면 양치 중
export const SMOOTHING = 0.15; // EMA 계수. 낮을수록 둔하고 안정적
export const STOP_DELAY_MS = 2000; // 신호가 끊겨도 이만큼은 양치 중으로 봐준다

// 입술 + 하관. 칫솔질이 흔드는 부위.
export const MOUTH_INDICES = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95,
  185, 40, 39, 37, 0, 267, 269, 270, 409, 415, 310, 311, 312, 13, 82, 81, 42, 183, 78, 172, 136,
  150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 205, 425, 50, 280,
];

// 칫솔질에 안 흔들리는 부위. 머리 전체 움직임의 기준.
const STABLE = [33, 133, 362, 263, 6, 168, 10, 234, 454, 127, 356];

function centroid(landmarks, indices) {
  let x = 0;
  let y = 0;
  for (const i of indices) {
    x += landmarks[i].x;
    y += landmarks[i].y;
  }
  return { x: x / indices.length, y: y / indices.length };
}

// 관자놀이 사이 거리. 정규화 기준으로 쓸 얼굴 크기.
function faceWidth(landmarks) {
  const dx = landmarks[454].x - landmarks[234].x;
  const dy = landmarks[454].y - landmarks[234].y;
  return Math.hypot(dx, dy);
}

export function createBrushDetector() {
  let prev = null;
  let prevAt = 0;
  let energy = 0;
  let lastSignalAt = 0;

  return {
    /** @returns {{brushing: boolean, energy: number}} */
    update(landmarks, now) {
      if (!landmarks) {
        prev = null;
        energy = 0;
        return { brushing: false, energy: 0 };
      }

      const width = faceWidth(landmarks);
      const dt = (now - prevAt) / 1000;
      let raw = 0;

      if (prev && dt > 0 && width > 0) {
        // 머리 전체가 이만큼 움직였다 — 입 움직임에서 빼낼 성분.
        const headNow = centroid(landmarks, STABLE);
        const headPrev = centroid(prev, STABLE);
        const headDx = headNow.x - headPrev.x;
        const headDy = headNow.y - headPrev.y;

        let sum = 0;
        for (const i of MOUTH_INDICES) {
          const dx = landmarks[i].x - prev[i].x - headDx;
          const dy = landmarks[i].y - prev[i].y - headDy;
          sum += Math.hypot(dx, dy);
        }
        raw = sum / MOUTH_INDICES.length / width / dt;
      }

      prev = landmarks;
      prevAt = now;
      energy = energy + (raw - energy) * SMOOTHING;

      // 애매하면 관대하게. 신호가 끊겨도 STOP_DELAY_MS 동안은 양치 중으로 유지한다.
      if (energy > BRUSH_THRESHOLD) lastSignalAt = now;
      const brushing = lastSignalAt > 0 && now - lastSignalAt < STOP_DELAY_MS;

      return { brushing, energy };
    },
  };
}
