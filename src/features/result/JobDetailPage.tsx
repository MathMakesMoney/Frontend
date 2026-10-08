import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteJob, fetchJob, fetchVariantLines, haesolDraftUrl, haesolUrl, variantUrl } from '../../shared/api'
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

  // 변형문제 정답+해설지 줄: make_variant_docs 뒤에만 있다 (없으면 null)
  const { data: variantLines } = useQuery({
    queryKey: ['variant', id],
    queryFn: () => fetchVariantLines(id!),
    enabled: !!id,
  })

  // MCP 도구가 불릴 때마다 서버가 changed 를 보낸다: 작업을 다시 받는다 (끊기면 EventSource 가 알아서 다시 붙는다)
  useEffect(() => {
    if (!id) return
    const events = new EventSource(`/api/jobs/${id}/events`)
    events.addEventListener('changed', () => {
      queryClient.invalidateQueries({ queryKey: ['job', id] })
      queryClient.invalidateQueries({ queryKey: ['variant', id] })
    })
    return () => events.close()
  }, [id, queryClient])

  async function handleDelete() {
    if (!id) return
    if (!confirm('이 작업을 삭제할까요? 되돌릴 수 없습니다.')) return
    await deleteJob(id)
    queryClient.removeQueries({ queryKey: ['job', id] })
    navigate('/jobs')
  }

  if (isLoading) return <div className="page">불러오는 중...</div>
  if (error || !job) return <div className="page">없는 작업입니다</div>

  const problems = job.problems ?? []
  const draft = job.draft ?? []

  return (
    <div className="page job-detail-page">
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

      <McpGuide jobId={job.id} jobTitle={job.title} />

      {(draft.length > 0 || job.files.hwp || job.files.hwpx || (job.problemCount > 0 && job.stage !== 'done')) && (
        <div className="job-document-toolbar" aria-label="해설지 보기 및 다운로드">
          {draft.length > 0 && <Link className="button" to={`/jobs/${job.id}/haesol`} title="쪽 목록 · 해설지 · 문항 목록 보기">해설지 보기</Link>}
          {(job.files.hwp || job.files.hwpx || (job.problemCount > 0 && job.stage !== 'done')) && (
            <div className="job-download-group">
              <span className="job-download-label">다운로드</span>
          {job.files.hwp && <a className="job-download-link" href={haesolUrl(job.id, 'hwp')}>HWP</a>}
          {job.files.hwpx && <a className="job-download-link" href={haesolUrl(job.id, 'hwpx')}>HWPX</a>}
          {job.problemCount > 0 && job.stage !== 'done' && <>
            <a className="job-download-link" href={haesolDraftUrl(job.id, 'hwp')}>진행본 HWP</a>
            <a className="job-download-link" href={haesolDraftUrl(job.id, 'hwpx')}>진행본 HWPX</a>
            <span className="job-download-note">미완료 문항은 검토 필요로 표시됩니다</span>
          </>}
            </div>
          )}
        </div>
      )}

      {variantLines && (
        <div className="job-document-toolbar" aria-label="변형문제 보기 및 다운로드">
          <Link className="button" to={`/jobs/${job.id}/variant`}>변형문제 보기</Link>
          <div className="job-download-group">
            <span className="job-download-label">변형문제</span>
            <a className="job-download-link" href={variantUrl(job.id, 'munje')}>문제지 HWP</a>
            <a className="job-download-link" href={variantUrl(job.id, 'haesol')}>정답+해설 HWP</a>
          </div>
        </div>
      )}

      {problems.length > 0 && <ProblemBrowser jobId={job.id} jobTitle={job.title} problems={problems} />}
    </div>
  )
}
