// public/art/ 의 파츠 이미지를 미리 다 받아둔다.
// 루프가 돌기 시작한 뒤에 이미지가 도착하면 공룡이 한 조각씩 나타나서 이상해진다.

const NAMES = [
  'dino-frame', // 입이 뚫린 공룡 얼굴 한 장. 파츠(볏/뿔/주둥이)를 대체한다.
  'bubble',
  'sparkle',
  'box-closed',
  'box-open',
];

export async function loadArt() {
  const pairs = await Promise.all(
    NAMES.map(
      (name) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve([name, img]);
          img.onerror = () => reject(new Error(`이미지 로드 실패: ${name}.png`));
          img.src = `/art/${name}.png`;
        }),
    ),
  );
  return Object.fromEntries(pairs);
}
