# design-spec-3d.md — 이미지 에셋 생성 명세 (안 B · 3D 카툰)

**안 A는 [design-spec.md](design-spec.md) (파스텔 플랫).** 이 문서는 대안이다. 둘 중 하나만 쓴다.

3D 렌더 카툰 스타일. 고채도, 입체감, 반짝이는 눈.
대상: 4~6세 미취학 아동. 사용처: 쇼핑몰 현장 테스트(노트북 웹캠).

앵커 위치와 조명 규칙을 어기면 얼굴에 안 붙는다. 스타일보다 이쪽이 우선이다.

---

## 0. 안 A 대신 이걸 골라야 하는 이유

**실사 영상 위에는 3D가 플랫보다 유리하다.** 이게 결정적이다.

아이의 진짜 얼굴은 입체이고 조명을 받고 있다. 그 위에 **납작한 벡터 그림을 얹으면 스티커를 붙인 것처럼 뜬다.**
3D 렌더 파츠는 자체 음영이 있어서 실제 얼굴의 입체감과 자연스럽게 이어진다.

여기에 고채도까지 더해지면 쇼핑몰의 밝은 조명에서도 안 묻힌다. 안 A의 약점이 정확히 이 두 가지였다.

**대신 감수할 것**: 에셋 간 스타일 통일이 훨씬 어렵다. 플랫은 색만 맞추면 되지만 3D는 조명·재질·카메라 각도까지 맞아야 한다. 9절의 참조 이미지 절차를 반드시 지킬 것.

---

## 1. 저작권 — 어디까지 되고 어디부터 안 되나

**보호되지 않는 것 (마음껏 써도 됨)**
- "빨간 공룡"이라는 발상
- 3D 카툰 렌더링 스타일, 밝은 하늘·초록 들판
- 큰 눈, 통통한 비율, 웃는 표정 같은 아동용 캐릭터 관습

**보호되는 것 (피해야 함)**
- 특정 캐릭터의 **고유한 조합** — 그 색 + 그 무늬 + 그 얼굴 비율 + 그 표정이 한꺼번에 재현되면 문제가 된다
- 브랜드명, 캐릭터 이름, 로고

**프롬프트에 절대 넣지 말 것**: `Pinkfong`, `Dinolings`, `공룡유치원`, 개별 캐릭터 이름.
이미지 AI가 실제로 그 캐릭터를 뱉으면 그 결과물 자체가 증거가 된다. 아래 스타일 블록만으로 같은 장르가 충분히 나온다.

> **포트폴리오 관점에서 더 중요한 이야기**: 이건 삼성 지원용으로 보여줄 결과물이다.
> 면접에서 "핑크퐁 짝퉁"으로 읽히면 스타일이 좋아도 손해다. 같은 장르의 **독자 캐릭터**가 실력 증명에 훨씬 유리하다.
> 다행히 우리가 만드는 건 전신 캐릭터가 아니라 **얼굴에 얹는 파츠**라서, 규격만 지켜도 자연스럽게 달라진다.

---

## 2. 공통 스타일 프롬프트

**모든 에셋 프롬프트 앞에 이 블록을 그대로 붙인다.** 매번 똑같이 넣어야 스타일이 안 튄다.

```
3D rendered children's animation still, modern CG cartoon style,
smooth glossy toy-like surfaces, soft rounded chunky forms,
bright vibrant saturated colors, cheerful and friendly,
soft even studio lighting from the front, gentle ambient occlusion,
big expressive eyes with glossy specular highlights,
clean and polished, high quality kids TV animation, ages 4-6,
```

**팔레트 (프롬프트에 hex를 직접 명시할 것)**

| 용도 | Hex |
|---|---|
| 하늘 | `#4aa8e8` |
| 구름 | `#ffffff` |
| 먼 언덕 | `#5aa84a` |
| 들판 (밝은/어두운) | `#7cc94a` / `#6cbf3f` |
| 공룡 몸 (기본) | `#e8503f` |
| 공룡 그늘 | `#c23e30` |
| 공룡 하이라이트 | `#f5705e` |
| 배 · 뿔 (크림) | `#f5e0c8` |
| 등 무늬 (짙은 코랄) | `#b8453a` |
| 눈동자 | `#2b2b2b` |
| 볼 홍조 | `#f08a7a` |
| 흙길 | `#c9a06b` |
| 포인트 노랑 | `#ffc93c` |

**색 개수 규칙**: 한 에셋에 **주요 색 4개까지.** 3D는 음영이 색을 자동으로 늘리기 때문에, 원색을 여러 개 쓰면 금세 지저분해진다.

**모든 프롬프트에 넣을 금지 조항**

```
No text, no letters, no numbers, no watermark, no signature, no logo.
No existing cartoon characters, no copyrighted mascots, no brand names.
Original character design only.
```

---

## 3. 무엇을 이미지로 뽑고, 무엇을 코드로 그리나

안 A와 동일하다. **이 구분을 어기면 못 쓰는 이미지가 나온다.**

**이미지로 뽑을 것**: 배경, 공룡 파츠, 거품·반짝이, 상자, 마스코트, 보상 아이템.

**코드로 그릴 것 (이미지 생성 금지)**
- **게이지·버튼·텍스트** — CSS. 이미지로 만들면 크기 대응이 안 된다
- **이빨** — 입술 랜드마크 11개에 각각 붙어 입을 벌리면 같이 벌어져야 한다. 통짜 이미지는 입을 못 따라간다
- **파티클의 움직임** — 거품 "한 알"만 받고, 개수·속도·궤적은 코드가 만든다
- **비네트** — 코드에서 처리

---

## 4. 납품 형식 (전 에셋 공통)

- **PNG, 투명 배경** (`bg-scene`만 예외로 불투명)
- 정사각형 캔버스, **피사체는 정중앙 정렬, 정면**
- 가장자리에 **10% 여백** — 꽉 채우면 회전할 때 잘린다
- 파일명은 표기 그대로. 코드가 이 이름으로 찾는다
- 저장 위치: `public/art/`
- **알파 경계 확인 필수** — 3D 렌더는 가장자리에 반투명 픽셀이나 검은 테두리가 남기 쉽다

---

## 5. 얼굴 오버레이 파츠

아이 얼굴에 실시간으로 얹히는 조각들. **조명 규칙이 3D에서 새로 추가된다.**

### 공통 규칙 (전 파츠)

- **정면, 좌우 대칭, 기울기 0도**
- **앵커 = 캔버스 정중앙.** 코드가 이 점을 얼굴 랜드마크에 맞춘다
- 파츠끼리 겹치지 않게 각각 따로 뽑을 것
- 얼굴·피부·눈은 **그리지 말 것.** 그 자리엔 아이의 진짜 얼굴이 있다

### 조명 규칙 (3D에서 가장 중요)

```
Lit evenly from the front with soft diffuse light.
No cast shadows, no strong side lighting, no rim light,
no dramatic highlights, no reflections of surroundings.
```

**이걸 빼면 못 쓴다.** 옆에서 조명을 받은 파츠는 정면 얼굴에 얹었을 때 그림자 방향이 어긋나서 붕 뜬다.
쇼핑몰 조명이 어느 방향일지 모르므로, 파츠는 **방향성 없는 부드러운 정면광**이어야 어디서든 붙는다.

### 5-1. `dino-crest.png` — 머리 위 볏

- 캔버스 1024×1024, 화면상 폭 = 얼굴폭의 **1.1배**
- 앵커: 볏의 **가로 중앙**, 세로는 **머리에 닿는 아랫변**이 캔버스 중앙

```
[공통 스타일 블록]
A row of five rounded dinosaur back plates in a gentle arch, front
view. Center plate largest, outer plates smaller. Warm red #e8503f
with #f5705e highlights on top and #c23e30 shade underneath, soft
glossy surface. Rounded and smooth, no sharp spikes.
[조명 규칙]
Isolated on transparent background, centered, symmetric, front view.
[금지 조항]
```

### 5-2. `dino-snout.png` — 코

- 캔버스 512×512, 폭 = 얼굴폭의 **0.45배**
- 앵커: **콧구멍 사이 중앙점**이 캔버스 정중앙

```
[공통 스타일 블록]
A chubby rounded dinosaur snout, front view, soft glossy 3D surface.
Warm red #e8503f on top fading to cream #f5e0c8 underneath, with two
small rounded nostrils in darker #c23e30. Puffy and toy-like.
No mouth, no teeth, no face, no eyes.
[조명 규칙]
Isolated on transparent background, centered, symmetric.
[금지 조항]
```

### 5-3. `dino-brow.png` — 눈두덩 (한쪽만, 코드가 반전)

- 캔버스 512×512, 폭 = 얼굴폭의 **0.3배**

```
[공통 스타일 블록]
A single rounded dinosaur brow ridge, a soft pillow-like curved form,
thicker on the outer end. Warm red #e8503f with #f5705e highlight,
glossy toy surface. No eye, no face, no skin.
[조명 규칙]
Isolated on transparent background, centered.
[금지 조항]
```

### 5-4. `dino-cheek.png` — 볼 비늘 (한쪽만, 코드가 반전)

- 캔버스 512×512, 폭 = 얼굴폭의 **0.32배**

```
[공통 스타일 블록]
A small cluster of six rounded raised scales in a loose patch, soft
glossy 3D bumps. Warm red #e8503f with #f5705e highlights, edges
softly faded so the patch blends outward.
[조명 규칙]
Isolated on transparent background, centered.
[금지 조항]
```

---

## 6. 파티클

**한 알만** 뽑는다. 개수·움직임은 코드가 만든다.

### 6-1. `bubble.png` — 거품 한 알 (256×256)

```
[공통 스타일 블록]
A single glossy round soap bubble, white and semi-transparent, with
one bright specular highlight in the upper left. Simple and clean,
no rainbow film, no background reflection.
[조명 규칙]
Isolated on transparent background, centered.
[금지 조항]
```

### 6-2. `sparkle.png` — 반짝이 한 알 (256×256)

```
[공통 스타일 블록]
A single four-pointed sparkle with soft rounded points, bright warm
yellow #ffc93c, glossy and simple, chunky proportions.
Isolated on transparent background, centered.
[금지 조항]
```

---

## 7. 배경

### 7-1. `bg-scene.png` — 카메라 창 바깥 세계

- **2560×1440 (16:9), 불투명**
- **중앙 70%는 카메라 창이 덮는다.** 그 안에 중요한 요소를 넣지 말 것

```
[공통 스타일 블록]
A bright cheerful prehistoric meadow, wide landscape, 3D rendered.
Vivid blue sky #4aa8e8 in the upper area with a few simple white
puffy clouds near the top corners. Rolling green hills #5aa84a in the
middle distance. A vibrant grass field #7cc94a and #6cbf3f filling the
lower third, with rounded bushes and a few simple ferns near the left
and right edges only.
The entire center of the image must stay empty and uncluttered -
plain sky and plain hills only, absolutely no objects in the middle.
No dinosaurs, no characters, no animals anywhere.
Wide establishing shot, simple and clean composition.
[금지 조항]
```

> **중앙 비우기와 "캐릭터 없음"을 꼭 확인하고 받을 것.** 이미지 AI가 둘 다 자주 무시한다.
> 배경에 공룡이 들어오면 카메라 창에 가려 목만 삐져나온다.

---

## 8. 마스코트 · 상자 · 아이템

### 8-1. `mascot-hello.png` — 인사하는 공룡 (1024×1024, 투명)

시작 화면에서 아이를 맞이한다. **글을 못 읽는 아이에게 "여기 봐"를 대신하는 역할이다.**

```
[공통 스타일 블록]
A cute chubby baby dinosaur standing and waving one hand, full body,
front view, friendly and welcoming, big happy eyes. Warm red #e8503f
body with a cream #f5e0c8 belly, rounded back plates along the head
and spine, soft #f08a7a cheek blush, short rounded arms and thick
stubby legs. Big head, small body, very rounded toy-like proportions.
[조명 규칙]
Isolated on transparent background, centered, full body visible.
[금지 조항]
```

### 8-2. `mascot-cheer.png` — 기뻐하는 공룡 (1024×1024, 투명)

**8-1과 같은 캐릭터로 보여야 한다.** 반드시 8-1을 참조 이미지로 넣고 포즈만 바꿀 것.

```
[공통 스타일 블록]
The same baby dinosaur character, now cheering with both arms raised
up, eyes happily closed in upward curves, mouth open in a big joyful
smile. Warm red #e8503f body, cream #f5e0c8 belly, #f08a7a cheeks.
[조명 규칙]
Isolated on transparent background, centered, full body visible.
[금지 조항]
```

### 8-3. `box-closed.png` / `box-open.png` (각 1024×1024, 투명)

**같은 상자여야 한다.** 닫힌 것을 참조 이미지로 열린 것을 생성할 것.

```
[공통 스타일 블록]
A cute rounded treasure chest, front view, glossy 3D toy style.
Cream #f5e0c8 body with a warm yellow #ffc93c lid and a small rounded
coral #f08a7a ribbon. Puffy with rounded corners, like a soft toy
chest. No metal, no lock, no hinges.
[조명 규칙]
Isolated on transparent background, centered.
[금지 조항]
```

열린 버전은 마지막 설명 문장을 이걸로 교체:

```
The same chest with the lid tilted open and a warm glow from inside.
Interior in warm #ffc93c. No items inside yet.
```

### 8-4. 보상 아이템 (`item-01.png` …, 각 512×512, 투명)

> **실물 상품이 확정된 뒤에 생성할 것.** 화면 이미지와 실제로 쥐여줄 물건이 반드시 일치해야 한다.
> 화면에서 본 것과 다른 걸 받으면 아이 입장에선 명백한 배신이고, 그 아이 데이터는 못 쓴다.

아이템당 **별도 파일.** 한 장에 여러 개 그리면 잘라내기가 지저분해진다.

```
[공통 스타일 블록]
A single [물건 이름], cute and simple, front view, glossy 3D toy style,
rounded friendly shape, vibrant colors.
[조명 규칙]
Isolated on transparent background, centered.
[금지 조항]
```

---

## 9. 생성 순서와 검수

**순서**: `mascot-hello` → `bg-scene` → 나머지.

안 A와 순서가 다르다. 3D는 **캐릭터가 재질과 조명의 기준**이 되므로 마스코트를 먼저 확정한다.
이후 모든 얼굴 파츠는 **`mascot-hello`를 참조 이미지로 넣어서** 생성해야 같은 공룡의 부위로 보인다.
이 절차를 건너뛰면 코는 매끈하고 볏은 우둘투둘한, 서로 다른 재질의 파츠 더미가 나온다.

**받을 때 확인할 것**

- [ ] 배경이 정말 투명한가 (흰 배경을 투명이라고 주는 경우가 흔하다)
- [ ] 알파 가장자리에 검은 테두리나 반투명 찌꺼기가 없는가 ← **3D에서 특히 자주 발생**
- [ ] 조명이 정면 확산광인가, 옆 그림자나 림라이트가 없는가 ← **가장 자주 놓치는 항목**
- [ ] 피사체가 정중앙인가, 가장자리 여백이 있는가
- [ ] 얼굴 파츠에 사람 얼굴·눈·피부가 섞여 있지 않은가
- [ ] 파츠끼리 재질과 광택이 같은가 (나란히 놓고 볼 것)
- [ ] `bg-scene` 중앙이 비어 있고 캐릭터가 없는가
- [ ] 글자·서명·워터마크·로고가 없는가
- [ ] 기존 캐릭터의 색·무늬·비율 조합을 그대로 따라가지 않았는가
