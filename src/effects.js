// 입 주변 거품과 반짝이. 양치 중일 때만 뿜어져 나온다.
// 목적은 "잘 만든 파티클"이 아니라 아이가 즉시 알아차릴 시각 피드백이다.
//
// 이미지는 한 종류씩만 있고, 개수·크기·궤적은 전부 여기서 만든다.

const SPAWN_PER_SEC = 26; // 양치 중 초당 생성 수
const LIFE_MS = 1400;

// 입술 바깥 테두리. 여기서 거품이 나온다.
const LIP_RING = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185,
];

const rand = (min, max) => min + Math.random() * (max - min);

export function createEffects(art) {
  const particles = [];
  let spawnDebt = 0;

  return {
    update(landmarks, brushing, dtMs) {
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

      if (!brushing || !landmarks) {
        spawnDebt = 0;
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
          size: star ? rand(0.05, 0.085) : rand(0.035, 0.1),
          star,
          spin: rand(0, Math.PI * 2),
          spinRate: rand(-0.0016, 0.0016),
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
        const s = p.size * width * (0.55 + t * 0.6);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x * width, p.y * height);
        ctx.rotate(p.spin);
        ctx.drawImage(img, -s / 2, -s / 2, s, s);
        ctx.restore();
      }
    },

    clear() {
      particles.length = 0;
      spawnDebt = 0;
    },
  };
}
