// 3단계: 입 주변 필터. 양치 중일 때만 거품과 별이 뿜어져 나온다.
// 목적은 "잘 만든 필터"가 아니라 아이가 즉시 알아차릴 시각 피드백이다.

const SPAWN_PER_SEC = 40; // 양치 중 초당 생성되는 거품 수
const LIFE_MS = 1200;

// 입술 바깥 테두리. 여기서 거품이 나온다.
const LIP_RING = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185,
];

const rand = (min, max) => min + Math.random() * (max - min);

export function createEffects() {
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
        p.vy -= 0.0000004 * dtMs; // 거품은 점점 위로 뜬다
      }

      if (!brushing || !landmarks) {
        spawnDebt = 0;
        return;
      }

      spawnDebt += (SPAWN_PER_SEC * dtMs) / 1000;
      while (spawnDebt >= 1) {
        spawnDebt -= 1;
        const anchor = landmarks[LIP_RING[(Math.random() * LIP_RING.length) | 0]];
        particles.push({
          x: anchor.x + rand(-0.012, 0.012),
          y: anchor.y + rand(-0.008, 0.008),
          vx: rand(-0.00004, 0.00004),
          vy: rand(-0.00008, -0.00002),
          r: rand(0.004, 0.013),
          star: Math.random() < 0.25,
          hue: rand(180, 220),
          age: 0,
        });
      }
    },

    draw(ctx, width, height) {
      for (const p of particles) {
        const t = p.age / LIFE_MS;
        const alpha = Math.sin(t * Math.PI); // 나타났다 사라진다
        const x = p.x * width;
        const y = p.y * height;
        const r = p.r * width * (0.6 + t * 0.7);

        if (p.star) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(t * 3);
          ctx.fillStyle = `rgba(255, 240, 150, ${alpha})`;
          drawStar(ctx, r);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 90%, 85%, ${alpha * 0.55})`;
          ctx.fill();
          ctx.strokeStyle = `hsla(${p.hue}, 90%, 97%, ${alpha * 0.9})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    },
  };
}

function drawStar(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
}
