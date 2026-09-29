import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteJob, fetchJob, haesolDraftUrl, haesolUrl } from '../../shared/api'
import { stageText } from '../../shared/stage'
import { McpGuide } from '../mcp/McpGuide'
import { ProblemBrowser } from './ProblemBrowser'
import { OriginalPages } from './OriginalPages'

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
  })

  // MCP 도구가 불릴 때마다 서버가 changed 를 보낸다: 작업을 다시 받는다 (끊기면 EventSource 가 알아서 다시 붙는다)
  useEffect(() => {
    if (!id) return
    const events = new EventSource(`/api/jobs/${id}/events`)
    events.addEventListener('changed', () => queryClient.invalidateQueries({ queryKey: ['job', id] }))
    return () => events.close()
  }, [id, queryClient])

  async function handleDelete() {
    if (!id) return
    if (!confirm('이 작업을 삭제할까요? 되돌릴 수 없습니다.')) return
    await deleteJob(id)
    queryClient.removeQueries({ queryKey: ['job', id] })
    navigate('/')
  }

  if (isLoading) return <div className="page">불러오는 중...</div>
  if (error || !job) return <div className="page">없는 작업입니다</div>

  const problems = job.problems ?? []
  const draft = job.draft ?? []

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

      <OriginalPages job={job} />

      <McpGuide jobId={job.id} />

      {draft.length > 0 && (
        <div className="downloads">
          <Link className="button" to={`/jobs/${job.id}/haesol`}>
            해설지 보기
          </Link>
          <span className="hint">쪽 목록 · 해설지 · 문항 목록을 한 화면에서 봅니다</span>
        </div>
      )}

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

      {job.problemCount > 0 && job.stage !== 'done' && (
        <div className="downloads">
          <a className="button" href={haesolDraftUrl(job.id, 'hwp')}>
            지금까지 풀이로 해설지 받기 (HWP)
          </a>
          <a className="button" href={haesolDraftUrl(job.id, 'hwpx')}>
            지금까지 풀이로 해설지 받기 (HWPX)
          </a>
          <span className="hint">안 푼 문항은 검토 필요: 풀이 누락 으로 들어갑니다</span>
        </div>
      )}

      {problems.length > 0 && <ProblemBrowser jobId={job.id} problems={problems} />}
    </div>
  )
}
