// 상자 개봉 보상.
//
// 지난번 상자는 지금은 하드코딩이다. 세션 간 저장은 프로토타입 범위 밖 —
// 나중에 실제로 저장하게 되면 이 상수만 저장소에서 읽어오면 된다.
export const PREVIOUS_BOX = { name: '실버박스', emoji: '⬜' };

// 꽝 없음. 항상 뭔가 나온다 — "얼마나 좋은가"의 차이만 있다 (도박성 배제 원칙).
const ITEMS = [
  { emoji: '🪥', name: '반짝 칫솔' },
  { emoji: '🧸', name: '곰인형' },
  { emoji: '🎈', name: '풍선' },
  { emoji: '🪁', name: '연' },
  { emoji: '🧩', name: '퍼즐 조각' },
  { emoji: '⚽', name: '축구공' },
  { emoji: '🛴', name: '킥보드' },
  { emoji: '🎨', name: '물감 팔레트' },
  { emoji: '🔦', name: '손전등' },
  { emoji: '🪀', name: '요요' },
  { emoji: '🎺', name: '트럼펫' },
  { emoji: '🧦', name: '줄무늬 양말' },
  { emoji: '👑', name: '왕관' },
  { emoji: '🚲', name: '자전거' },
  { emoji: '🔭', name: '망원경' },
];

export function pickItem() {
  return ITEMS[Math.floor(Math.random() * ITEMS.length)];
}
