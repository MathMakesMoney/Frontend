import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { deleteJob, fetchJob, haesolUrl, type Problem } from '../../shared/api'
import { stageText } from '../../shared/stage'
import { McpGuide } from '../mcp/McpGuide'
import { ProblemCard } from './ProblemCard'
import { OriginalPages } from './OriginalPages'
import { HaesolPreview } from './HaesolPreview'

// 검토 필요 문항을 앞으로 정렬
function sortForReview(problems: Problem[]): Problem[] {
  return [...problems].sort((a, b) => {
    const aReview = a.review !== null ? 0 : 1
    const bReview = b.review !== null ? 0 : 1
    if (aReview !== bReview) return aReview - bReview
    return a.no - b.no
  })
}

// 작업 상세: MCP 안내, 진행 상태, 문항별 결과, 다운로드
export function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const {
    data: job,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['job', id],
    queryFn: () => fetchJob(id!),
    enabled: !!id,
    retry: false, // 없는 작업(404)을 재시도로 붙들고 있지 않는다
    refetchInterval: (query) => (query.state.data?.stage === 'done' ? false : 5000),
  })

  async function handleDelete() {
    if (!id) return
    if (!confirm('이 작업을 삭제할까요? 되돌릴 수 없습니다.')) return
    await deleteJob(id)
    queryClient.removeQueries({ queryKey: ['job', id] })
    navigate('/')
  }

  if (isLoading) return <div className="page">불러오는 중...</div>
  if (error || !job) return <div className="page">없는 작업입니다</div>

  const problems = sortForReview(job.problems ?? [])

  return (
    <div className="page">
      <div className="page-header">
        <h1>{job.title}</h1>
        <button type="button" className="button-danger" onClick={handleDelete}>
          작업 삭제
        </button>
      </div>

      <p className="job-meta">
        {job.inputType} · 교과 범위: {job.scope} ·{' '}
        {stageText(job.stage, job.solvedCount, job.problemCount)}
      </p>

      {job.inputType === 'PDF' && <OriginalPages jobId={job.id} pages={job.pages} />}

      <McpGuide jobId={job.id} />

      {(job.files.hwp || job.files.hwpx) && (
        <div className="downloads">
          {job.files.hwp && (
            <a className="button" href={haesolUrl(job.id, 'hwp')}>
              해설지 HWP 다운로드
            </a>
          )}
          {job.files.hwpx && (
            <a className="button" href={haesolUrl(job.id, 'hwpx')}>
              해설지 HWPX 다운로드
            </a>
          )}
        </div>
      )}

      {job.files.hwpx && (
        <HaesolPreview jobId={job.id} header={job.header ?? ''} version={`${job.stage}-${job.solvedCount}-${job.reviewCount}`} />
      )}

      {problems.length > 0 && (
        <section className="problems">
          <h2>문항별 결과</h2>
          {problems.map((problem) => (
            <ProblemCard key={problem.no} jobId={job.id} problem={problem} />
          ))}
        </section>
      )}
    </div>
  )
}
