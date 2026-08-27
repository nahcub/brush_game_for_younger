// "지금 양치 중인가 / 아닌가" 이진 판정.
// 어느 이를 닦는지는 판정하지 않는다 — 게임을 진행시키는 트리거일 뿐이다.
//
// 신호: 입/하관 랜드마크의 움직임 에너지.
//
// 핵심은 "얼굴에 붙어서 보기"다. 각 입술 점을 화면 좌표가 아니라
// 얼굴 좌표계(원점=머리 중심, 단위=얼굴폭, 축=관자놀이 방향)로 옮겨서 비교한다.
// 그러면 다음이 전부 저절로 상쇄된다:
//   - 고개를 돌리거나 몸이 움직임 (평행이동)
//   - 카메라에 가까워지고 멀어짐 / 폰을 들고 흔듦 (크기 변화)
//   - 고개를 갸웃함 / 폰이 기울어짐 (회전)
// 화면 좌표에서 빼는 방식으로는 평행이동밖에 못 없앤다.
//
// 화면 비율도 여기서 보정한다. 정규화 좌표(0~1)의 x와 y는 단위가 다르다 —
// 노트북(가로)과 폰(세로)에서 비율이 뒤집히면 같은 움직임이 다른 수치로 나온다.

// ---- 튜닝 상수 (웹캠 디버그 수치 보면서 조정) ----
export const BRUSH_THRESHOLD = 0.32; // 얼굴폭/초. 이 위면 양치 중
export const SMOOTHING = 0.15; // EMA 계수. 낮을수록 둔하고 안정적
export const STOP_DELAY_MS = 2000; // 신호가 끊겨도 이만큼은 양치 중으로 봐준다
const MIN_FACE = 0.06; // 얼굴이 이보다 작으면 랜드마크가 너무 흔들려서 못 믿는다

// 입만 벌렸다 닫아도 위 신호는 튄다. 손이 입 근처에 와 있을 때만 "양치 중"으로 인정한다.
export const HAND_NEAR_THRESHOLD = 1.1; // 얼굴좌표계 단위(얼굴폭 기준). 이 안이면 "가까움"
export const HAND_STOP_DELAY_MS = 700; // 칫솔에 손가락이 가려져 잠깐 놓쳐도 이만큼은 "가까움" 유지

// 앞니 닦을 땐 입은 거의 안 움직이고 손(칫솔)만 흔들린다.
// 그래서 "입 움직임" 대신 "손 자체의 움직임"도 브러싱 신호로 인정한다.
export const HAND_MOVE_THRESHOLD = 0.55; // 얼굴폭/초. 손이 이 이상 흔들리면 브러싱으로 인정

// 입술 + 하관. 칫솔질이 흔드는 부위.
export const MOUTH_INDICES = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95,
  185, 40, 39, 37, 0, 267, 269, 270, 409, 415, 310, 311, 312, 13, 82, 81, 42, 183, 78, 172, 136,
  150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 205, 425, 50, 280,
];

// 칫솔질에 안 흔들리는 부위. 머리 자세의 기준.
const STABLE = [33, 133, 362, 263, 6, 168, 10, 234, 454, 127, 356];
const TEMPLE_L = 234;
const TEMPLE_R = 454;

/**
 * 머리의 위치·크기·기울기. aspect는 화면 가로/세로 비로, x를 y와 같은 단위로 맞춘다.
 */
function headPose(lm, aspect) {
  let cx = 0;
  let cy = 0;
  for (const i of STABLE) {
    cx += lm[i].x * aspect;
    cy += lm[i].y;
  }
  cx /= STABLE.length;
  cy /= STABLE.length;

  const dx = lm[TEMPLE_R].x * aspect - lm[TEMPLE_L].x * aspect;
  const dy = lm[TEMPLE_R].y - lm[TEMPLE_L].y;
  return { cx, cy, size: Math.hypot(dx, dy), angle: Math.atan2(dy, dx) };
}

/** 입술 점들을 얼굴 좌표계로 옮긴다. 결과는 평행이동·크기·회전에 불변이다. */
function mouthInFaceSpace(lm, pose, aspect) {
  const cos = Math.cos(-pose.angle);
  const sin = Math.sin(-pose.angle);
  const out = new Float32Array(MOUTH_INDICES.length * 2);

  for (let k = 0; k < MOUTH_INDICES.length; k++) {
    const p = lm[MOUTH_INDICES[k]];
    const dx = p.x * aspect - pose.cx;
    const dy = p.y - pose.cy;
    out[k * 2] = (dx * cos - dy * sin) / pose.size;
    out[k * 2 + 1] = (dx * sin + dy * cos) / pose.size;
  }
  return out;
}

/** 점 하나를 얼굴 좌표계로 옮긴다. 손 랜드마크를 입과 같은 기준으로 비교하기 위함. */
function pointInFaceSpace(x, y, pose, aspect) {
  const cos = Math.cos(-pose.angle);
  const sin = Math.sin(-pose.angle);
  const dx = x * aspect - pose.cx;
  const dy = y - pose.cy;
  return {
    x: (dx * cos - dy * sin) / pose.size,
    y: (dx * sin + dy * cos) / pose.size,
  };
}

export function createBrushDetector() {
  let prev = null;
  let prevAt = 0;
  let energy = 0;
  let lastSignalAt = 0;
  let lastHandNearAt = 0;
  let handPrev = null;
  let handPrevAt = 0;
  let handEnergy = 0;
  let lastHandMoveAt = 0;

  return {
    /**
     * @param {number} aspect 영상의 가로/세로 비. 안 주면 정사각으로 본다.
     * @param {Array<Array<{x:number,y:number}>>} hands 손마다 21개 랜드마크. 없으면 [].
     * @returns {{brushing: boolean, energy: number, handNear: boolean}}
     */
    update(landmarks, hands, now, aspect = 1) {
      if (!landmarks) {
        prev = null;
        energy = 0;
        handPrev = null;
        handEnergy = 0;
        return { brushing: false, energy: 0, handNear: false };
      }

      const pose = headPose(landmarks, aspect);
      if (pose.size < MIN_FACE) {
        prev = null;
        energy = 0;
        handPrev = null;
        handEnergy = 0;
        return { brushing: false, energy: 0, handNear: false };
      }

      const curr = mouthInFaceSpace(landmarks, pose, aspect);
      const dt = (now - prevAt) / 1000;
      let raw = 0;

      if (prev && dt > 0) {
        let sum = 0;
        for (let k = 0; k < MOUTH_INDICES.length; k++) {
          sum += Math.hypot(curr[k * 2] - prev[k * 2], curr[k * 2 + 1] - prev[k * 2 + 1]);
        }
        raw = sum / MOUTH_INDICES.length / dt;
      }

      prev = curr;
      prevAt = now;
      energy += (raw - energy) * SMOOTHING;

      let mcx = 0;
      let mcy = 0;
      for (let k = 0; k < MOUTH_INDICES.length; k++) {
        mcx += curr[k * 2];
        mcy += curr[k * 2 + 1];
      }
      mcx /= MOUTH_INDICES.length;
      mcy /= MOUTH_INDICES.length;

      // 입에 가장 가까운 손 하나를 고른다 (양손이 잡히면 더 가까운 쪽).
      let closestHand = null;
      let closestDist = Infinity;
      for (const hand of hands ?? []) {
        let hx = 0;
        let hy = 0;
        for (const p of hand) {
          hx += p.x;
          hy += p.y;
        }
        hx /= hand.length;
        hy /= hand.length;
        const hp = pointInFaceSpace(hx, hy, pose, aspect);
        const dist = Math.hypot(hp.x - mcx, hp.y - mcy);
        if (dist < closestDist) {
          closestDist = dist;
          closestHand = hp;
        }
      }

      const handNearNow = closestHand !== null && closestDist < HAND_NEAR_THRESHOLD;
      if (handNearNow) lastHandNearAt = now;
      const handNear = lastHandNearAt > 0 && now - lastHandNearAt < HAND_STOP_DELAY_MS;

      // 손 자체의 움직임(앞니 닦을 때처럼 입은 안 움직이고 손만 흔들리는 경우 대비).
      const handDt = (now - handPrevAt) / 1000;
      let handRaw = 0;
      if (closestHand && handPrev && handDt > 0) {
        handRaw = Math.hypot(closestHand.x - handPrev.x, closestHand.y - handPrev.y) / handDt;
      }
      handPrev = closestHand;
      handPrevAt = now;
      handEnergy += (handRaw - handEnergy) * SMOOTHING;
      if (handEnergy > HAND_MOVE_THRESHOLD) lastHandMoveAt = now;
      const handMoving = lastHandMoveAt > 0 && now - lastHandMoveAt < STOP_DELAY_MS;

      // 애매하면 관대하게. 신호가 끊겨도 STOP_DELAY_MS 동안은 양치 중으로 유지한다.
      if (energy > BRUSH_THRESHOLD) lastSignalAt = now;
      const mouthActive = lastSignalAt > 0 && now - lastSignalAt < STOP_DELAY_MS;

      // 손이 입 근처에 있고, (입이 움직이거나 손 자체가 움직이면) 양치 중으로 인정한다.
      // 앞니를 닦을 땐 입은 거의 안 움직이므로 손의 움직임만으로도 인정돼야 한다.
      const brushing = handNear && (mouthActive || handMoving);

      return { brushing, energy, handNear };
    },
  };
}
