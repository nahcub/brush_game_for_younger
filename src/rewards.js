// 상자 개봉 보상.
//
// 실물 상품을 나눠줄 계획이므로, 확정되면 이 목록을 실제 재고와 1:1로 맞춰야 한다.
// 화면에서 본 것과 다른 걸 받으면 아이 입장에선 명백한 배신이고, 그 아이 데이터는 못 쓴다.
// 자세한 건 design-spec-3d.md 8-4절.

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
