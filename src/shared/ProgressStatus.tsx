import type { Job } from './api'
import { PROGRESS_LABEL } from './stage'

// 학원 시험지 작업의 진행 표시 (진행 중·보류·완료·실패). 실패면 사유를 같이 보인다
export function ProgressStatus({ job }: { job: Pick<Job, 'progress' | 'progressError'> }) {
  if (!job.progress) return null
  const tone = job.progress === 'done' ? 'done' : job.progress === 'hold' || job.progress === 'failed' ? job.progress : 'working'
  return <>
    <span className={`job-status ${tone}`}>{PROGRESS_LABEL[job.progress]}</span>
    {job.progress === 'failed' && job.progressError && <span className="job-review">{job.progressError}</span>}
  </>
}
