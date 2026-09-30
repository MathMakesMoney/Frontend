import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { fetchJob, haesolDraftUrl, haesolUrl } from '../../../shared/api'
import { useHaesolLayout } from '../haesolPages'
import { PageThumbs } from './PageThumbs'
import { PageStage } from './PageStage'
import { ProblemIndex } from './ProblemIndex'
import type { ProblemEntry } from './types'
import './viewer.css'

// 해설지 보기: 왼쪽 쪽 썸네일, 가운데 쪽 한 장, 오른쪽 쪽별 문항 목록 (타이퍼랩 문제 편집 화면 모양, 수정은 없음)
export function HaesolViewerPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { data: job, isLoading, error } = useQuery({
    queryKey: ['job', id],
    queryFn: () => fetchJob(id!),
    enabled: !!id,
    retry: false,
  })

  // 풀이가 저장되면 다시 받는다 (작업 상세와 같은 SSE)
  useEffect(() => {
    if (!id) return
    const events = new EventSource(`/api/jobs/${id}/events`)
    events.addEventListener('changed', () => queryClient.invalidateQueries({ queryKey: ['job', id] }))
    return () => events.close()
  }, [id, queryClient])

  const [current, setCurrent] = useState(0)
  const [active, setActive] = useState<string | null>(null)
  const header = job?.header ?? ''
  const layout = useHaesolLayout(job?.id ?? '', header, job?.draft ?? [], !!job)
  const pageCount = layout.pages.length

  // 쪽이 줄면 마지막 쪽으로
  useEffect(() => {
    if (pageCount > 0 && current >= pageCount) setCurrent(pageCount - 1)
  }, [pageCount, current])

  if (isLoading) return <div className="page">불러오는 중...</div>
  if (error || !job) return <div className="page">없는 작업입니다</div>

  // 해설지에 나온 문항마다 쪽과 문항 정보를 붙인다 (문항 정보는 표시 번호 label 로 찾는다)
  const byLabel = new Map((job.problems ?? []).map((p) => [p.label ?? String(p.no), p]))
  const entries: ProblemEntry[] = layout.pages.flatMap((pg, page) =>
    pg.labels
      .filter((label) => layout.pages.findIndex((q) => q.labels.includes(label)) === page) // 여러 쪽에 걸친 문항은 첫 쪽에만
      .map((label) => {
        const p = byLabel.get(label)
        return { label, page, answer: p?.answer ?? null, review: p?.review ?? null, hasFigure: (p?.figures.length ?? 0) > 0 }
      }),
  )

  function selectPage(page: number) {
    setCurrent(page)
    setActive(null)
  }

  // 쪽 위에서 누른 문항 (쪽은 그대로, 오른쪽 목록에 표시)
  function pickLabel(label: string) {
    setActive(label)
  }

  function selectEntry(entry: ProblemEntry) {
    setCurrent(entry.page)
    setActive(entry.label)
  }

  return (
    <div className="viewer">
      <div className="viewer-bar">
        <Link to={`/jobs/${job.id}`} className="button-plain">← 작업 상세</Link>
        <h1 className="viewer-title">{job.title}</h1>
        <div className="viewer-downloads">
          {job.files.hwp && <a className="button" href={haesolUrl(job.id, 'hwp')}>HWP 다운로드</a>}
          {job.files.hwpx && <a className="button" href={haesolUrl(job.id, 'hwpx')}>HWPX 다운로드</a>}
          {job.problemCount > 0 && job.stage !== 'done' && (
            <>
              <a className="button" href={haesolDraftUrl(job.id, 'hwp')}>초안 HWP 다운로드</a>
              <a className="button" href={haesolDraftUrl(job.id, 'hwpx')}>초안 HWPX 다운로드</a>
            </>
          )}
        </div>
      </div>
      {job.problemCount > 0 && job.stage !== 'done' && (
        <p className="hint">지금까지 저장된 풀이로 받습니다 · 안 푼 문항은 검토 필요: 풀이 누락으로 표시됩니다</p>
      )}
      {layout.measure}
      {(job.draft ?? []).length === 0 ? (
        <p className="viewer-empty">아직 저장된 풀이가 없습니다</p>
      ) : pageCount === 0 ? (
        <p className="viewer-empty">쪽을 나누는 중...</p>
      ) : (
        <div className="viewer-grid">
          <PageThumbs jobId={job.id} header={header} layout={layout} current={current} entries={entries} onSelect={selectPage} />
          <PageStage jobId={job.id} header={header} layout={layout} current={current} active={active} onChange={selectPage} onPick={pickLabel} />
          <ProblemIndex entries={entries} pageCount={pageCount} current={current} active={active} onSelect={selectEntry} />
        </div>
      )}
    </div>
  )
}
