import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteJob, fetchJob, fetchVariantLines, haesolDraftUrl, haesolUrl, variantUrl, type Job } from '../../shared/api'
import { featureText, stageText } from '../../shared/stage'
import { mcpPrompt } from '../../shared/mcpCommand'
import { ProgressStatus } from '../../shared/ProgressStatus'
import { McpGuide } from '../mcp/McpGuide'
import { ProblemBrowser } from './ProblemBrowser'
import { OriginalPages } from './OriginalPages'
import { AcademyDownloads } from './AcademyDownloads'
import { AcademyPreview } from './AcademyPreview'
import { HoldPanel } from './HoldPanel'
import { resultTabs } from './resultTabs'

// 작업 상세: MCP 안내, 진행 상태, 문항별 결과, 다운로드
export function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const {
    data: job,
    dataUpdatedAt,
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
  // 보류 결정·문항 손 수정 뒤: 응답의 새 작업으로 바로 그리고, 목록·묶음 화면도 새로 받게 한다
  const onChanged = (next: Job) => {
    queryClient.setQueryData(['job', id], next)
    queryClient.invalidateQueries({ queryKey: ['jobs'] })
    queryClient.invalidateQueries({ queryKey: ['batch'] })
  }

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

      {/* 학원 시험지 작업: 고른 기능과 진행. 보류면 아래 보류 문항 목록에서 결정한다 */}
      {job.features && <p className="job-meta job-academy">
        만들 기능: {featureText(job.features)} <ProgressStatus job={job} />
        {job.batch && <> · <Link to={`/batches/${job.batch.id}`}>묶음 {job.batch.name}</Link></>}
      </p>}
      {job.features?.includes('variant') && <p className="hint">풀이담 AI 실행은 해설 뒤 변형 문제·풀이와 결과 문서까지 만들어요. 보류 문항이 있으면 먼저 결정해 주세요. 변형 중 멈춰도 다시 실행하면 남은 것부터 이어져요.</p>}
      {job.progress === 'hold' && <p className="job-hold" role="status">검토 필요: 해설 판정에 사람이 확인할 문항이 있어 결과 문서를 만들지 않았어요</p>}
      <HoldPanel job={job} onDecided={onChanged} />

      <OriginalPages job={job} />
      {/* 작업을 다시 받을 때마다(SSE changed, 보류 결정) 펼쳐 둔 결과 문서을 새로 받는다 */}
      <AcademyPreview job={job} version={dataUpdatedAt} />

      {/* HML 작업은 해설·변형 차례일 때만 MCP 연결 안내를 보인다 (타이핑만이면 AI 단계가 없다) */}
      {(job.inputType !== 'HML' || job.progress === 'haesol' || job.progress === 'variant') && <McpGuide prompt={mcpPrompt(window.location.origin, job.id, job.title)} />}

      {(draft.length > 0 || job.files.hwp || job.files.hwpx || job.files.academyHwp || (job.problemCount > 0 && job.stage !== 'done')) && (
        <div className="job-document-toolbar" aria-label="결과물 보기 및 다운로드">
          {resultTabs(job).length > 0 && <Link className="button" to={`/jobs/${job.id}/haesol`} title="쪽 목록 · 해설지 · 결과 문서 보기">결과물 보기</Link>}
          {(job.files.hwp || job.files.hwpx || job.files.academyHwp || (job.problemCount > 0 && job.stage !== 'done')) && (
            <div className="job-download-group">
              <span className="job-download-label">다운로드</span>
          {job.files.hwp && <a className="job-download-link" href={haesolUrl(job.id, 'hwp')}>HWP</a>}
          {job.files.hwpx && <a className="job-download-link" href={haesolUrl(job.id, 'hwpx')}>HWPX</a>}
          <AcademyDownloads jobId={job.id} files={job.files} />
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

      {problems.length > 0 && <ProblemBrowser jobId={job.id} jobTitle={job.title} problems={problems} cellsEditable={job.inputType === 'HML'} onSaved={onChanged} />}
    </div>
  )
}
