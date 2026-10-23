import type { Feature, Job, Progress, Stage } from './api'

// 내부 단계 이름을 강사 눈높이 말로 바꾼다 (jobs, result 둘 다 사용)
const STAGE_LABEL: Record<Stage, string> = {
  uploaded: '업로드됨',
  problems: '문항 저장됨',
  figures: '문항 저장됨',
  solving: '풀이 저장',
  done: '완료',
}

export function stageText(stage: Stage, solved: number, total: number): string {
  if (stage === 'solving') return `풀이 저장 ${solved}/${total}`
  return STAGE_LABEL[stage]
}

// 학원 시험지 제작 진행 (기능을 고른 작업). 내부 값 대신 강사 눈높이 말로 보인다
export const PROGRESS_LABEL: Record<Progress, string> = {
  extract: '문항 뽑기 차례',
  haesol: '해설 진행 중',
  hold: '보류 · 검토 필요',
  variant: '변형 차례',
  done: '완료',
  failed: '실패',
}

export const FEATURE_LABEL: Record<Feature, string> = { typing: '타이핑', haesol: '해설', variant: '변형' }

export function featureText(features: Feature[]): string {
  return features.map(feature => FEATURE_LABEL[feature]).join(' · ')
}

// 목록의 상태 묶음: progress 가 있으면 그것으로, 없으면 단계로 가른다
export function jobPhase(job: Pick<Job, 'stage' | 'progress'>): 'uploaded' | 'working' | 'done' {
  if (job.progress) return job.progress === 'done' ? 'done' : 'working'
  return job.stage === 'done' ? 'done' : job.stage === 'uploaded' ? 'uploaded' : 'working'
}
