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
const FOREHEAD = 10; // 이마 꼭대기
const CHIN = 152;

// 파츠를 따로 붙이지 않는다.
// 볏·뿔·주둥이를 각각 얹으면 얼굴 위에 스티커 세 장이 떠 있는 것처럼 읽혔다.
// 입이 뚫린 공룡 얼굴 한 장으로 감싸면, 아이 얼굴이 공룡 입 안에 들어간
// 한 덩어리 그림이 된다 (design-spec-3d.md 5-2의 "한 덩어리로 읽힌다"와 같은 이유).
// 이빨도 이 한 장에 이미 그려져 있다.
const FRAME = 'dino-frame';

// 프레임 이미지 안에서 "입 구멍"이 차지하는 위치·크기. 값은 이미지 폭/높이의 비율이다.
// 이미지를 새로 그리면 여기만 다시 재면 된다.
// (1254x1254 이미지에서 알파 0인 영역을 실측한 값)
const HOLE_CX = 0.5;
const HOLE_CY = 0.608;
const HOLE_W = 0.446;

// 입 구멍이 얼굴폭의 몇 배인가. 얼굴폭은 관자놀이 사이 거리라서 귀·머리카락은 포함하지 않는다.
// 1.0보다 조금 작은 게 맞다 — 구멍 테두리가 볼에 살짝 걸쳐야 얼굴이 입 안에 들어간 것처럼 보인다.
// 키우면 공룡 머리가 화면을 다 먹는다.
const FIT = 0.88;

/** 픽셀 공간에서 얼굴의 중심·크기·기울기를 뽑는다. */
function faceFrame(lm, W, H) {
  const lx = lm[TEMPLE_L].x * W;
  const ly = lm[TEMPLE_L].y * H;
  const rx = lm[TEMPLE_R].x * W;
  const ry = lm[TEMPLE_R].y * H;
  return {
    // 프레임의 중심은 미간이 아니라 얼굴 한가운데다. 이마~턱의 중점을 쓴다.
    cx: ((lm[FOREHEAD].x + lm[CHIN].x) / 2) * W,
    cy: ((lm[FOREHEAD].y + lm[CHIN].y) / 2) * H,
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

      const img = art[FRAME];
      if (img) {
        const w = (f.size * FIT) / HOLE_W;
        const h = w * (img.height / img.width);

        ctx.save();
        ctx.translate(f.cx, f.cy);
        ctx.rotate(f.angle);
        // 구멍의 중심이 얼굴 중심에 오도록 이미지를 민다.
        ctx.drawImage(img, -HOLE_CX * w, -HOLE_CY * h, w, h);
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
