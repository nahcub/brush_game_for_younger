// MediaPipe wasm 런타임과 얼굴 모델을 public/으로 가져온다.
// CDN 대신 자체 서빙해야 오프라인에서도 돌고, 온디바이스 실행이 코드에서 드러난다.
import { cp, mkdir, writeFile, access } from 'node:fs/promises';
import { Buffer } from 'node:buffer';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const MODEL_PATH = 'public/models/face_landmarker.task';

await mkdir('public/models', { recursive: true });
await cp('node_modules/@mediapipe/tasks-vision/wasm', 'public/wasm', { recursive: true });
console.log('wasm 런타임 복사 완료 → public/wasm');

try {
  await access(MODEL_PATH);
  console.log('모델 이미 있음 → public/models/face_landmarker.task');
} catch {
  const res = await fetch(MODEL_URL);
  if (!res.ok) throw new Error(`모델 다운로드 실패: ${res.status}`);
  await writeFile(MODEL_PATH, Buffer.from(await res.arrayBuffer()));
  console.log('모델 다운로드 완료 → public/models/face_landmarker.task');
}
