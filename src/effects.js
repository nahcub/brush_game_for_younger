// 입 주변 거품과 반짝이. 양치 중일 때만 뿜어져 나온다.
// 목적은 "잘 만든 파티클"이 아니라 아이가 즉시 알아차릴 시각 피드백이다.
//
// 두 갈래로 나뉜다.
//  1) 입 주변 거품 — 오버레이 캔버스(미러). 얼굴을 가리면 안 되므로 작게 유지한다.
//  2) 게이지로 날아가는 거품 — 화면 전체 캔버스. "내가 만든 거품이 위의 바를 채운다"를
//     글자 없이 보여주는 장치다. 카메라 창 밖(상단 HUD)까지 가야 해서 별도 캔버스에 그린다.
//
// 이미지는 한 종류씩만 있고, 개수·크기·궤적은 전부 여기서 만든다.

const SPAWN_PER_SEC = 11; // 입가에만 머무는 거품. 대부분은 게이지로 보낸다
const LIFE_MS = 1400;

// 게이지로 가는 쪽이 주력이다. 입가에서 그냥 흩어지는 거품이 더 많으면
// "내 거품이 바를 채운다"가 아니라 "가끔 뭔가 날아간다"로 읽힌다.
const FLY_PER_SEC = 20;
const FLY_MS = 950;

// 입술 바깥 테두리. 여기서 거품이 나온다.
const LIP_RING = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185,
];

const rand = (min, max) => min + Math.random() * (max - min);
const smoothstep = (t) => t * t * (3 - 2 * t);

export function createEffects(art) {
  const particles = [];
  const flyers = [];
  let spawnDebt = 0;
  let flyDebt = 0;

  return {
    // flow: { from:{x,y}, to:{x,y} } — 화면(#world) 좌표. 입에서 게이지 끝까지.
    // 얼굴이 안 보이거나 게이지를 못 재면 null.
    update(landmarks, brushing, dtMs, flow = null) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.age += dtMs;
        if (p.age >= LIFE_MS) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dtMs;
        p.y += p.vy * dtMs;
        p.vy -= 0.0000005 * dtMs; // 거품은 점점 위로 뜬다
        p.spin += p.spinRate * dtMs;
      }

      for (let i = flyers.length - 1; i >= 0; i--) {
        const f = flyers[i];
        f.age += dtMs;
        if (f.age >= FLY_MS) flyers.splice(i, 1);
        else f.spin += f.spinRate * dtMs;
      }

      if (!brushing || !landmarks) {
        spawnDebt = 0;
        flyDebt = 0;
        return;
      }

      spawnDebt += (SPAWN_PER_SEC * dtMs) / 1000;
      while (spawnDebt >= 1) {
        spawnDebt -= 1;
        const anchor = landmarks[LIP_RING[(Math.random() * LIP_RING.length) | 0]];
        const star = Math.random() < 0.22;
        particles.push({
          x: anchor.x + rand(-0.014, 0.014),
          y: anchor.y + rand(-0.01, 0.01),
          vx: rand(-0.00005, 0.00005),
          vy: rand(-0.00009, -0.00003),
          // 얼굴을 가리지 않을 만큼만. 개수로 존재감을 내고 크기로는 내지 않는다.
          size: star ? rand(0.022, 0.04) : rand(0.018, 0.045),
          star,
          spin: rand(0, Math.PI * 2),
          spinRate: rand(-0.0016, 0.0016),
          age: 0,
        });
      }

      if (!flow) {
        flyDebt = 0;
        return;
      }

      flyDebt += (FLY_PER_SEC * dtMs) / 1000;
      while (flyDebt >= 1) {
        flyDebt -= 1;
        const x0 = flow.from.x + rand(-18, 18);
        const y0 = flow.from.y + rand(-10, 10);
        const tx = flow.to.x + rand(-6, 6);
        const ty = flow.to.y;
        flyers.push({
          x0,
          y0,
          tx,
          ty,
          // 제어점을 입 쪽 위에 둔다 — 거품이 먼저 떠오른 다음 게이지를 따라 미끄러져
          // 들어간다. 두 점 위로 부풀리면 게이지가 이미 화면 맨 위라 곡선이 잘려나간다.
          cx: x0 + (tx - x0) * rand(0.05, 0.25),
          cy: ty + rand(10, 55),
          size: rand(14, 24),
          star: Math.random() < 0.25,
          spin: rand(0, Math.PI * 2),
          spinRate: rand(-0.002, 0.002),
          age: 0,
        });
      }
    },

    draw(ctx, width, height) {
      for (const p of particles) {
        const img = p.star ? art.sparkle : art.bubble;
        if (!img) continue;

        const t = p.age / LIFE_MS;
        const alpha = Math.sin(t * Math.PI); // 나타났다 사라진다
        const s = p.size * width * (0.6 + t * 0.45);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x * width, p.y * height);
        ctx.rotate(p.spin);
        ctx.drawImage(img, -s / 2, -s / 2, s, s);
        ctx.restore();
      }
    },

    // 카메라 창 밖으로 나가는 거품. #world 전체를 덮는 캔버스에 그린다.
    drawFlow(ctx) {
      for (const f of flyers) {
        const img = f.star ? art.sparkle : art.bubble;
        if (!img) continue;

        const t = f.age / FLY_MS;
        const e = smoothstep(t);
        const u = 1 - e;
        const x = u * u * f.x0 + 2 * u * e * f.cx + e * e * f.tx;
        const y = u * u * f.y0 + 2 * u * e * f.cy + e * e * f.ty;

        // 게이지에 닿는 순간 작아지며 사라진다 — 바에 "흡수됐다"로 읽히게.
        const s = f.size * (1 - 0.6 * e);
        const alpha = Math.min(1, t * 5) * (1 - smoothstep(Math.max(0, (t - 0.72) / 0.28)));

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.rotate(f.spin);
        ctx.drawImage(img, -s / 2, -s / 2, s, s);
        ctx.restore();
      }
    },

    clear() {
      particles.length = 0;
      flyers.length = 0;
      spawnDebt = 0;
      flyDebt = 0;
    },
  };
}
