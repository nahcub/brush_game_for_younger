# design-spec.md — 이미지 에셋 생성 명세

이미지 생성 AI에 넘길 에셋 명세다. 목적은 "예쁜 그림"이 아니라 **코드에 그대로 끼울 수 있는 그림**이다.
앵커 위치와 여백 규칙을 어기면 얼굴에 안 붙는다. 스타일보다 이쪽이 중요하다.

대상: 4~6세 미취학 아동. 사용처: 쇼핑몰 현장 테스트(노트북 웹캠).

---

## 0. 무엇을 이미지로 뽑고, 무엇을 코드로 그리나

**이미지로 뽑을 것 (이 문서의 대상)**
배경 일러스트, 공룡 파츠, 거품·반짝이, 상자, 시작 화면 마스코트, 보상 아이템.

**코드로 그릴 것 (이미지 생성 금지 — 뽑아봐야 못 쓴다)**
- **게이지·버튼·텍스트** — CSS로 그린다. 이미지로 만들면 크기 대응이 안 된다
- **이빨** — 입술 랜드마크 11개에 각각 붙어서 입을 벌리면 같이 벌어져야 한다. 통짜 이미지는 입을 못 따라간다
- **파티클의 움직임** — 거품 "한 알"만 이미지로 받고, 개수·속도·궤적은 코드가 만든다
- **비네트(가장자리 흐림)** — 코드에서 처리

---

## 1. 공통 스타일 프롬프트

**모든 에셋 프롬프트 앞에 이 블록을 그대로 붙인다.** 이걸 매번 똑같이 넣어야 에셋 간 스타일이 안 튄다.

```
Soft pastel children's illustration, flat vector style, no outlines,
rounded chunky shapes only, no sharp corners or points,
low saturation muted colors, gentle and cozy mood,
soft cel shading with one flat shadow tone, no gradients,
no drop shadows, no glow, no texture, no noise,
clean minimal composition, cute and friendly, ages 4-6,
```

**팔레트 (프롬프트에 hex를 직접 명시할 것)**

| 용도 | Hex |
|---|---|
| 하늘 | `#d3e9f0` |
| 먼 언덕 | `#c3e2d5` |
| 풀밭 (밝은/어두운) | `#b2ddbe` / `#a2d3b0` |
| 공룡 몸 (기본) | `#9ed9a8` |
| 공룡 그늘 | `#8ecb99` |
| 공룡 하이라이트 | `#b0e4b9` |
| 크림 (프레임·거품) | `#fdf3dc` / `#fdf9f0` |
| 볼 홍조 | `#f6c0b2` |
| 살구 (게이지·포인트) | `#f2b880` |
| 눈동자 | `#5a6b62` |
| 노랑 (반짝이) | `#f7d98e` |
| 라벤더 (꽃) | `#d6c3ea` |

**모든 프롬프트에 넣을 금지 조항**

```
No text, no letters, no numbers, no watermark, no signature.
No existing cartoon characters, no Pokemon, no copyrighted mascots.
Original design only.
```

> 저작권 주의: 레퍼런스 무드는 참고하되 **기존 캐릭터를 닮게 하라는 지시를 절대 넣지 말 것.**
> "Pokemon style", "like Snorlax" 같은 문구는 금지. 위 스타일 블록만으로 충분히 같은 무드가 나온다.

---

## 2. 납품 형식 (전 에셋 공통)

- **PNG, 투명 배경** (배경 일러스트 `bg-scene`만 예외로 불투명)
- 정사각형 캔버스, **피사체는 정중앙 정렬, 정면**
- 캔버스 가장자리에 **10% 여백** — 꽉 채우면 코드에서 회전시킬 때 잘린다
- 파일명은 아래 표기 그대로. 코드가 이 이름으로 찾는다
- 저장 위치: `public/art/`

---

## 3. 얼굴 오버레이 파츠 (가장 중요)

아이 얼굴 위에 실시간으로 얹히는 조각들이다. **앵커 규칙이 스타일보다 우선한다.**

공통 규칙:
- **정면, 좌우 대칭, 기울기 0도**
- **앵커 = 캔버스 정중앙.** 코드가 이 중앙점을 얼굴 랜드마크에 맞춘다
- 파츠끼리 겹치지 않게, 각각 따로 뽑을 것 (한 장에 얼굴 전체를 그리면 못 쓴다)
- 얼굴·피부·눈은 **그리지 말 것.** 아이의 진짜 얼굴이 그 자리에 있다

### 3-1. `dino-crest.png` — 머리 위 둥근 혹

- 캔버스 1024×1024, 화면상 폭 = 얼굴폭의 **1.15배**
- 앵커: 혹 줄기의 **가로 중앙**, 세로는 **혹이 머리에 닿는 아랫변**이 캔버스 중앙에 오도록

```
[공통 스타일 블록]
A row of five soft rounded bumps in a gentle arch, like a baby
dinosaur's back ridge seen from the front. Center bump largest,
outer bumps smaller. Pastel green #9ed9a8 with #b0e4b9 highlight
on top of each bump and #8ecb99 shade underneath. Puffy and
pillow-like, completely smooth, no spikes, no points, no outline.
Isolated on transparent background, centered, front view, symmetric.
[금지 조항]
```

### 3-2. `dino-snout.png` — 코

- 캔버스 512×512, 화면상 폭 = 얼굴폭의 **0.42배**
- 앵커: **콧구멍 사이 중앙점**이 캔버스 정중앙

```
[공통 스타일 블록]
A chubby rounded dinosaur snout, front view, oval and puffy like a
soft marshmallow. Pastel green #9ed9a8 with lighter #b0e4b9 on the
upper half. Two small soft oval nostrils in muted #7bb388.
No mouth, no teeth, no face, no outline. Very soft and round.
Isolated on transparent background, centered, symmetric.
[금지 조항]
```

### 3-3. `dino-cheek.png` — 볼 비늘 (한쪽만)

- 캔버스 512×512, 화면상 폭 = 얼굴폭의 **0.3배**
- 앵커: 비늘 뭉치의 중심. 코드가 좌우 반전해서 양쪽에 쓴다

```
[공통 스타일 블록]
A small cluster of six soft rounded scales arranged in a loose
patch, like gentle pastel green polka dots. Color #9ed9a8, slightly
translucent, edges very soft. Flat, no outline, no shadow.
Isolated on transparent background, centered.
[금지 조항]
```

### 3-4. `dino-brow.png` — 눈 위 능선 (선택)

- 캔버스 512×512, 폭 = 얼굴폭의 **0.28배**. 한쪽만, 코드가 반전
- 없어도 되지만 있으면 표정이 살아난다

```
[공통 스타일 블록]
A single soft rounded eyebrow ridge for a cute baby dinosaur,
a gentle pastel green #9ed9a8 curved pillow shape, thicker on the
outer end. Smooth, no outline, no eye, no face.
Isolated on transparent background, centered.
[금지 조항]
```

---

## 4. 파티클 (작게, 단순하게)

**한 알만** 뽑는다. 개수·크기·움직임은 코드가 만든다. 복잡하면 작게 줄었을 때 뭉개진다.

### 4-1. `bubble.png` — 거품 한 알
- 캔버스 256×256

```
[공통 스타일 블록]
A single soft round soap bubble, cream white #fdf9f0, semi-transparent,
with one small soft highlight dot in the upper left. Very simple,
flat, no outline, no rainbow, no reflection detail.
Isolated on transparent background, centered.
[금지 조항]
```

### 4-2. `sparkle.png` — 반짝이 한 알
- 캔버스 256×256

```
[공통 스타일 블록]
A single simple four-pointed sparkle with soft rounded points,
warm pastel yellow #f7d98e, flat solid color, no outline, no glow.
Very simple and chunky.
Isolated on transparent background, centered.
[금지 조항]
```

---

## 5. 배경 일러스트

### 5-1. `bg-scene.png` — 카메라 창 바깥 세계
- **2560×1440 (16:9), 불투명**
- **중앙 70% 영역은 카메라 창이 덮는다.** 그 안에 중요한 요소를 넣지 말 것
- 장식은 **가장자리와 아래쪽**에만

```
[공통 스타일 블록]
A cozy pastel meadow scene, wide landscape. Soft #d3e9f0 sky in the
upper area with two simple rounded cream clouds near the top corners.
Rolling soft mint hills #c3e2d5 in the middle distance. A gentle grass
field #b2ddbe and #a2d3b0 filling the lower third, with small rounded
grass tufts and tiny simple flowers in coral #f6c0b2, lavender #d6c3ea
and yellow #f7d98e scattered near the left and right edges and along
the bottom.
The entire center of the image must stay empty and uncluttered -
plain sky and plain hills only, no objects in the middle.
Flat, no outline, no perspective detail, very calm and simple.
[금지 조항]
```

> 중앙을 비우라는 지시는 **꼭 확인하고 받을 것.** 이미지 AI가 자주 무시한다.
> 중앙에 나무나 동물이 들어오면 카메라 창에 가려서 이상하게 잘린다.

---

## 6. 마스코트 (시작 화면)

### 6-1. `mascot-hello.png` — 인사하는 공룡
- 캔버스 1024×1024, 투명
- 시작 화면에서 아이를 맞이한다. 글자를 못 읽는 아이에게 "여기 봐"를 대신하는 역할

```
[공통 스타일 블록]
A cute chubby baby dinosaur standing and waving one hand, full body,
front view, friendly and welcoming. Pastel green #9ed9a8 body with
cream #fdf3dc belly, soft rounded bumps along the head and back,
big round dark #5a6b62 eyes with a small white highlight, soft coral
#f6c0b2 cheek blush, tiny rounded feet. Very round and puffy overall,
no sharp shapes, no outline.
Isolated on transparent background, centered, full body visible.
[금지 조항]
```

### 6-2. `mascot-cheer.png` — 기뻐하는 공룡
- 같은 규격. 완료 화면용. **6-1과 같은 캐릭터로 보여야 한다**
- 생성 팁: 6-1을 참조 이미지로 넣고 포즈만 바꾸도록 지시할 것

```
[공통 스타일 블록]
The same cute chubby baby dinosaur, now cheering with both arms
raised up and eyes happily closed in upward curves, mouth open in a
big smile. Pastel green #9ed9a8 body, cream #fdf3dc belly, soft coral
#f6c0b2 cheek blush. Very round and puffy, no outline.
Isolated on transparent background, centered, full body visible.
[금지 조항]
```

---

## 7. 상자

### 7-1. `box-closed.png` / 7-2. `box-open.png`
- 각 1024×1024, 투명. **같은 상자여야 한다** (닫힌 것을 참조 이미지로 열린 것 생성)

```
[공통 스타일 블록]
A cute rounded treasure box, front view, soft pastel colors.
Cream #fdf3dc body with a soft apricot #f2b880 lid and a small
rounded coral #f6c0b2 ribbon. Puffy and pillow-like with rounded
corners, like a soft toy box. No outline, no metal, no lock.
Isolated on transparent background, centered.
[금지 조항]
```

열린 버전은 마지막 두 줄을 이걸로 교체:

```
The same box with the lid tilted open and a soft warm cream glow
coming from inside. Interior in warm #f7d98e. No items inside yet.
```

---

## 8. 보상 아이템

> **실물 상품이 확정된 뒤에 생성할 것.** 화면 이미지와 실제로 손에 쥐여줄 물건이 반드시 일치해야 한다.
> 화면에서 본 것과 다른 걸 받으면 아이 입장에서는 명백한 배신이고, 그 아이 데이터는 못 쓴다.

- 아이템당 512×512, 투명, **각각 별도 파일** (`item-01.png` …)
- 한 장에 여러 개 그리게 하면 잘라내기가 지저분해진다

```
[공통 스타일 블록]
A single [물건 이름], simple and cute, front view, soft rounded shape,
pastel colors, flat, no outline, no shadow. Toy-like and friendly.
Isolated on transparent background, centered.
[금지 조항]
```

---

## 9. 생성 순서와 검수

**순서**: `bg-scene` → `mascot-hello` → 나머지.
배경과 마스코트가 톤을 결정하므로 이 둘을 먼저 확정하고, 이후 에셋은 그 둘을 **참조 이미지로 넣어서** 생성해야 스타일이 안 튄다.

**받을 때 확인할 것**
- [ ] 배경이 정말 투명한가 (흰색 배경을 투명이라고 주는 경우가 흔하다)
- [ ] 외곽선이 없는가
- [ ] 그림자·글로우·그라데이션이 안 들어갔는가
- [ ] 피사체가 정중앙인가, 가장자리 여백이 있는가
- [ ] 얼굴 파츠에 사람 얼굴·눈·피부가 섞여 있지 않은가
- [ ] `bg-scene`의 중앙이 비어 있는가
- [ ] 글자·서명·워터마크가 없는가
- [ ] 기존 캐릭터를 닮지 않았는가
