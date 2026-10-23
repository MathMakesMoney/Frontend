import type { Job } from '../../shared/api'

// 결과물 보기에 보일 탭: 해설지(해설 줄이 있고 해설을 쓰는 작업), 결과 문서(academy.hwp 가 있을 때). 비면 결과물 보기 버튼도 없다
// HML 은 해설을 고른 작업만 해설을 쓴다 (타이핑만이면 draft 가 없다)
export function resultTabs(job: Job): ('haesol' | 'academy')[] {
  const haesol = (job.draft?.length ?? 0) > 0 && (job.inputType !== 'HML' || !!job.features?.includes('haesol'))
  return [...(haesol ? (['haesol'] as const) : []), ...(job.files.academyHwp ? (['academy'] as const) : [])]
}
