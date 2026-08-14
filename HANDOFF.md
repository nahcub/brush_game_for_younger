# 작업 인계 (2026-08-14)

공룡 필터를 "파츠 조립"에서 "입 뚫린 얼굴 한 장 씌우기"로 바꾼 작업. 필터는 끝났고,
새로 생성한 마스코트·배경 이미지를 앱에 연결하는 일이 남았다.

## 1. 지금까지 한 일

### 필터 방식 교체 (완료)

이전에는 볏·뿔·주둥이 3개 PNG를 랜드마크마다 따로 얹었다. 얼굴 위에 스티커 세 장이
떠 있는 것처럼 읽혀서, 입이 뚫린 공룡 얼굴 **한 장**(`dino-frame.png`)을 얼굴에 씌우는
방식으로 바꿨다. 아이 얼굴이 공룡 입 안에 들어간 한 덩어리 그림이 된다.

- `src/filter.js` — `PARTS` 배열 제거, 프레임 한 장을 그리는 코드로 교체.
  프레임 안 "입 구멍"의 중심을 얼굴 중심(이마 10 ~ 턱 152의 중점)에 맞추고,
  관자놀이(234/454) 기울기만큼 회전한다. 양치 중 반응은 파츠별 통통 튀기 대신
  머리 전체가 살짝 커졌다 작아지는 것으로 바꿨고, 입가 반짝임(`drawShine`)은 그대로다.
- `src/assets.js` — 로드 목록에서 `dino-crest` / `dino-snout` / `dino-horn-l` /
  `dino-horn-r`를 빼고 `dino-frame`을 넣었다. (PNG 파일 자체는 `public/art/`에 남아 있다.)

### 프레임 이미지 2차 생성 (완료)

1차 이미지는 입 구멍이 가로로 납작해서(가로 0.65 / 세로 0.45) 이마와 턱이 이빨에 닿았다.
세로로 긴 구멍으로 다시 생성해서 교체했다. 현재 이미지 실측값:

| 항목 | 값 |
| --- | --- |
| 캔버스 | 1254 x 1254 |
| 구멍 중심 | (0.500, 0.608) |
| 구멍 크기 | 가로 0.446 / 세로 0.516 |
| 팔레트 | 몸통 `#E8432F`, 옆 가시 `#FB7D61`, 이빨·눈 흰자 `#FDF9F4` |

`src/filter.js`의 `HOLE_CX` / `HOLE_CY` / `HOLE_W`는 이 실측값으로 맞춰져 있다.
**이미지를 새로 그리면 이 값들을 다시 재야 한다** (재는 방법은 아래 4번).

`FIT`(구멍 폭 ÷ 얼굴폭)은 0.88. 얼굴폭은 관자놀이 사이 거리라 귀·머리카락을 포함하지
않으므로 1.0보다 작은 게 맞다 — 테두리가 볼에 살짝 걸쳐야 입 안에 들어간 것처럼 보인다.
크기 조절은 `FIT` 하나만 건드리면 된다.

### 이미지 생성 프롬프트 (전달 완료, 결과물 도착)

같은 캐릭터를 유지하기 위해 "캐릭터 시트 공통 블록 + 자세별 한 줄" 구조로 짰다.
팔레트를 hex로 못박고, 배경 프롬프트에서는 **빨강 금지**를 명시했다 (빨간 공룡과
빨간 시작 버튼이 배경에 묻히므로).

## 2. 변경된 파일

| 파일 | 내용 |
| --- | --- |
| `src/filter.js` | 파츠 조립 → 프레임 한 장. 상수 4개(`HOLE_CX/CY/W`, `FIT`)로 정렬 튜닝 |
| `src/assets.js` | 로드 목록 교체 (`dino-frame` 추가, 파츠 3종 제거) |
| `public/art/dino-frame.png` | 세로로 긴 구멍 버전으로 교체 |
| `.claude/launch.json` | dev 서버 포트를 5180으로 고정 (`--strictPort`). 다른 창이 5173을 쓰고 있었다 |
| `filter-test.html` | **임시 파일.** 정렬 확인용. 아래 4번 참고. 작업 끝나면 삭제 |

> 참고: `src/main.js`의 GPU→CPU 델리게이트 폴백 보강(커밋 `28597ce`)은 다른 세션에서
> 이뤄진 작업이다. 이 저장소를 동시에 편집하는 다른 창이 있으니 이어받을 때
> `git log`를 먼저 확인할 것.

## 3. 남은 할 일

### (1) 새 에셋을 코드에 연결 — 지금 제일 급한 것

`public/art/`에 생성된 이미지가 들어와 있지만 **아직 어디에서도 쓰이지 않는다.**
전부 커밋되지 않은 상태(`??`)다.

```
background.png      mascot-brush.png    mascot-cheer.png
mascot-icon.png     mascot-look.png     mascot-peek.png
moscot-hello.png    ← 파일명 오타. mascot-hello.png 로 고칠 것
```

해야 할 일:

- `moscot-hello.png` → `mascot-hello.png` 로 이름 변경
- `index.html`은 지금 시작 화면과 상단 HUD에 **`mascot.png` 한 장을 같이** 쓴다
  (`#hud-mascot`, `#start-mascot`). 이걸 나눠야 한다:
  - `#start-mascot` → `mascot-hello.png`
  - `#hud-mascot` → `mascot-icon.png` (40px로 줄여도 안 뭉개지도록 따로 뽑은 것)
- `background.png` → `src/style.css`의 `#start`에 연결. 현재는 크림색 반투명 판
  `rgba(247, 232, 206, 0.9)`이 웹캠 위를 덮는 구조라, 배경 이미지가 이 판을 대체한다.
  연결 후 마스코트와 시작 버튼이 배경에 묻히지 않는지 확인할 것.
- `mascot-cheer.png` → 완료 화면(`#complete`), `mascot-look.png` → 얼굴 미인식 상태,
  `mascot-brush.png` → 시작 화면에서 "뭘 하는 게임인지" 글자 없이 알려주는 용도.
  `mascot-peek.png`는 화면 가장자리 장식용. 이 4개는 배치 위치를 새로 정해야 한다.
- 새로 쓰는 이미지 중 캔버스에 그리는 것이 있으면 `src/assets.js`의 `NAMES`에 추가
  (DOM `<img>`로만 쓰면 추가 불필요).

### (2) 프레임 세로 위치 실검증

`HOLE_CY`를 0.63(눈대중) → 0.608(실측)으로 고치면서 프레임이 얼굴폭 200px 기준
약 8px 아래로 내려갔다. 크기는 그대로다(393.9px → 394.6px, 0.17% 차이).
수치로만 확인했고 **웹캠으로 눈으로 본 검증은 아직 안 했다.**
어색하면 `HOLE_CY`를 0.63으로 되돌리면 된다.

### (3) 정리

- `filter-test.html` 삭제 (임시 파일인데 커밋 `5aff9fc`에 딸려 들어갔다)
- 안 쓰는 파츠 PNG 정리 여부 결정: `dino-crest.png`, `dino-snout.png`,
  `dino-horn-l.png`, `dino-horn-r.png` — 코드에서 참조하지 않는다
- 새 에셋 커밋

## 4. 이어받을 때 알아두면 되는 것

**dev 서버**

```bash
npm run dev
```

포트는 5180 고정(`.claude/launch.json`). Vite는 `PORT` 환경변수를 안 읽어서
`--port 5180 --strictPort`를 직접 넘긴다.

**정렬 확인**

`filter-test.html`은 웹캠 없이 프레임 배치만 보는 임시 페이지다.
`filter.js`가 실제로 쓰는 랜드마크는 234 / 454 / 10 / 152 넷뿐이라, 그 넷만 가짜로
만들고 같은 좌표에 얼굴 타원을 그려서 눈으로 정렬을 본다.
`http://localhost:5180/filter-test.html`

**구멍 실측 방법**

프레임 이미지를 새로 그렸다면, 위 테스트 페이지 콘솔에서 알파 0인 영역을 훑어
`HOLE_CX` / `HOLE_CY` / `HOLE_W`를 다시 잰다:

```js
const img = window.__art['dino-frame'];
const cv = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height });
const c = cv.getContext('2d');
c.drawImage(img, 0, 0);
const d = c.getImageData(0, 0, img.width, img.height).data;
const a = (x, y) => d[(y * img.width + x) * 4 + 3];
const cx = img.width >> 1;
let cy = Math.round(img.height * 0.62), l = cx, r = cx, t = cy, b = cy;
while (l > 0 && a(l, cy) < 20) l--;
while (r < img.width - 1 && a(r, cy) < 20) r++;
while (t > 0 && a(cx, t) < 20) t--;
while (b < img.height - 1 && a(cx, b) < 20) b++;
console.log({ cx: (l + r) / 2 / img.width, cy: (t + b) / 2 / img.height, w: (r - l) / img.width });
```

**바꾸면 안 되는 것** (`CLAUDE.md` / `plan.md`)

- 판정은 "닦는다 / 안 닦는다" 이진값이다. 어느 이를 닦는지까지 보지 않는다
- 애매하면 "닦는 중"으로 판정한다. 아이를 혼내는 방향으로 기울지 않는다
  (`mascot-look.png`을 슬픈 표정이 아니라 궁금해하는 표정으로 뽑은 것도 같은 이유)
- 게이지는 실제 감지된 움직임에만 찬다. 얼굴이 보인다고 차면 안 된다
- 전부 브라우저에서 돈다. 서버·클라우드 추론을 넣지 않는다
