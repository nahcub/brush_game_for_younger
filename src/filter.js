// 공룡 변신 필터 — 이 게임의 첫인상 전부.
//
// 4~6세 대상이라 전제가 하나 있다: 아이는 설명을 못 읽는다.
// 그래서 카메라에 얼굴이 들어온 "그 순간" 이미 공룡이 되어 있어야 한다.
// 시작 버튼을 누르기 전에도 필터는 돈다.
//
// 반응 규칙도 하나뿐이다: 닦으면 공룡이 신나고, 멈추면 가라앉는다.

// ---- 좌표 기준점 ----
const TEMPLE_L = 234; // 관자놀이. 둘 사이 거리가 얼굴 크기이자 기울기 기준
const TEMPLE_R = 454;
const BROW_MID = 168; // 미간. 얼굴 로컬 좌표계의 원점
const NOSE_TIP = 1;
const FOREHEAD = 10; // 이마 꼭대기

// 이빨은 여기서 그리지 않는다.
// 입술 랜드마크마다 도형을 따로 찍으면 이빨이 아니라 주사위 눈처럼 보였다.
// 이빨은 주둥이 이미지에 함께 그려져 있어야 한 덩어리로 읽힌다 (design-spec-3d.md 5-2).

/**
 * 파츠 배치표. 길이 단위는 전부 "얼굴폭 = 1.0"이다.
 * 카메라에서 멀어져도 같은 비율로 붙게 하려면 픽셀이 아니라 얼굴폭 기준이어야 한다.
 *
 * anchor: 이 랜드마크 위에 놓는다 (없으면 미간 기준 로컬 좌표)
 * w: 파츠의 가로 폭
 * dx, dy: 앵커에서 밀어낼 거리 (+y가 아래)
 * bounce: 양치 중일 때 통통 튀는 진폭
 */
const PARTS = [
  // 뿔은 관자놀이 옆에 둔다. 위로 올리면 볏의 바깥 판과 겹쳐서 지저분해진다.
  { art: 'dino-horn-l', w: 0.44, dx: -0.58, dy: -0.08, bounce: 0.03 },
  { art: 'dino-horn-r', w: 0.44, dx: 0.58, dy: -0.08, bounce: 0.03 },
  { art: 'dino-crest', anchor: FOREHEAD, w: 1.5, dx: 0, dy: -0.06, bounce: 0.055 },
  // 주둥이가 공룡으로 읽히게 하는 부위다. 코만 덮으면 사람 얼굴에 스티커를 붙인 꼴이 된다.
  // 코부터 윗입술까지 함께 가려야 한다.
  { art: 'dino-snout', anchor: NOSE_TIP, w: 0.86, dx: 0, dy: 0.15, bounce: 0.02 },
];

/** 픽셀 공간에서 얼굴의 중심·크기·기울기를 뽑는다. */
function faceFrame(lm, W, H) {
  const lx = lm[TEMPLE_L].x * W;
  const ly = lm[TEMPLE_L].y * H;
  const rx = lm[TEMPLE_R].x * W;
  const ry = lm[TEMPLE_R].y * H;
  return {
    cx: lm[BROW_MID].x * W,
    cy: lm[BROW_MID].y * H,
    size: Math.hypot(rx - lx, ry - ly),
    angle: Math.atan2(ry - ly, rx - lx),
  };
}

export function createFilter(art) {
  let cheer = 0; // 0=가라앉음, 1=신남
  let t = 0;

  return {
    update(brushing, dtMs) {
      t += dtMs;
      // 표정은 천천히 따라가야 한다. 판정이 깜빡일 때마다 공룡이 경련하면 안 된다.
      cheer += ((brushing ? 1 : 0) - cheer) * Math.min(1, dtMs / 260);
    },

    draw(ctx, lm, W, H) {
      if (!lm) return;
      const f = faceFrame(lm, W, H);
      const bob = Math.sin(t / 105) * cheer;

      for (const p of PARTS) {
        const img = art[p.art];
        if (!img) continue;

        // 앵커가 있으면 그 랜드마크 위에, 없으면 미간에서 회전 오프셋만큼 떨어진 곳에.
        let ax;
        let ay;
        if (p.anchor !== undefined) {
          ax = lm[p.anchor].x * W;
          ay = lm[p.anchor].y * H;
        } else {
          ax = f.cx;
          ay = f.cy;
        }

        const lift = (p.bounce ?? 0) * bob;
        const w = f.size * p.w * (1 + lift * 0.5);
        const h = w * (img.height / img.width);

        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(f.angle);
        ctx.drawImage(
          img,
          -w / 2 + p.dx * f.size,
          -h / 2 + (p.dy - lift) * f.size,
          w,
          h,
        );
        ctx.restore();
      }

      if (cheer > 0.25) drawShine(ctx, art.sparkle, lm, W, H, f, t, cheer);
    },
  };
}

// 양치 중일 때 입가에서 반짝임이 돈다. "잘하고 있다"는 신호.
function drawShine(ctx, sparkle, lm, W, H, f, t, cheer) {
  if (!sparkle) return;
  const anchors = [61, 291, 0, 17];
  for (let i = 0; i < anchors.length; i++) {
    const phase = (t / 460 + i * 0.55) % 1;
    const alpha = Math.sin(phase * Math.PI) * cheer;
    if (alpha <= 0.03) continue;

    const p = lm[anchors[i]];
    const s = f.size * (0.11 + phase * 0.09);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x * W, p.y * H);
    ctx.rotate(phase * 2.4 + i);
    ctx.drawImage(sparkle, -s / 2, -s / 2, s, s);
    ctx.restore();
  }
}
