import type { Stage } from './api'

// 내부 단계 이름을 강사 눈높이 말로 바꾼다 (jobs, result 둘 다 사용)
const STAGE_LABEL: Record<Stage, string> = {
  uploaded: '업로드됨',
  problems: '문항 저장됨',
  figures: '문항 저장됨',
  solving: '풀이 중',
  done: '완료',
}

export function stageText(stage: Stage, solved: number, total: number): string {
  if (stage === 'solving') return `풀이 중 ${solved}/${total}`
  return STAGE_LABEL[stage]
}
