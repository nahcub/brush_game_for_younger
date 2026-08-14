// 3초에 한 줄씩 넘어가는 양치 노래.
// 양치가 진행 중일 때만 넘어간다 — 멈췄는데 가사만 흘러가면 따라 할 수가 없다.

export const LINE_MS = 3000;

export const LYRICS = [
  '치카치카 샤카샤카',
  '위로위로 아래아래',
  '치카치카 구석구석',
  '치카치카 깨끗하게',
  '샤카샤카 이를 닦자',
  '위로위로 아래아래 치카치카',
  '칫솔 들고 위아래로',
  '이를 닦자 쓱쓱 쓱쓱',
  '오른쪽 왼쪽 구석구석',
  '앞니도 어금니도 치카치카',
  '치카치카 샤카샤카',
  '위로위로 아래아래',
  '치카치카 구석구석',
  '치카치카 깨끗하게',
  '샤카샤카 이를 닦자',
];

export function createLyrics() {
  let index = 0;
  let elapsedMs = 0;

  return {
    /** @returns {boolean} 줄이 바뀌었는지 */
    update(dtMs) {
      elapsedMs += dtMs;
      if (elapsedMs < LINE_MS) return false;
      elapsedMs -= LINE_MS;
      index = (index + 1) % LYRICS.length;
      return true;
    },

    get line() {
      return LYRICS[index];
    },

    reset() {
      index = 0;
      elapsedMs = 0;
    },
  };
}
