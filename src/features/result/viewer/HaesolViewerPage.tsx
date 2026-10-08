import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { fetchJob, fetchVariantLines, fetchVariantMunje, haesolDraftUrl, haesolUrl, variantUrl } from '../../../shared/api'
import { HEAD, HaesolPage, labelsOf, useHaesolLayout } from '../haesolPages'
import { MunjePage, munjeCells, munjePageCount } from './MunjePage'
import { PageThumbs } from './PageThumbs'
import { PageStage } from './PageStage'
import { ProblemIndex } from './ProblemIndex'
import type { ProblemEntry } from './types'
import './viewer.css'

// 해설지 보기: 왼쪽 쪽 썸네일, 가운데 쪽 한 장, 오른쪽 쪽별 문항 목록 (타이퍼랩 문제 편집 화면 모양, 수정은 없음)
// variant 면 변형문제: [문제지] 탭(처음, variant/munje.json 을 한글 문제지와 같은 2단 4칸으로, 정답 숨김)과
// [정답+해설] 탭(variant/haesol.txt 를 해설지와 같은 모양으로)
export function HaesolViewerPage({ variant = false }: { variant?: boolean }) {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'munje' | 'haesol'>('munje')
  const { data: job, isLoading, error } = useQuery({
    queryKey: ['job', id],
    queryFn: () => fetchJob(id!),
    enabled: !!id,
    retry: false,
  })
  const { data: variantLines } = useQuery({
    queryKey: ['variant', id],
    queryFn: () => fetchVariantLines(id!),
    enabled: !!id && variant,
  })
  const { data: munje } = useQuery({
    queryKey: ['variant-munje', id],
    queryFn: () => fetchVariantMunje(id!),
    enabled: !!id && variant,
  })

  // 풀이가 저장되면 다시 받는다 (작업 상세와 같은 SSE)
  useEffect(() => {
    if (!id) return
    const events = new EventSource(`/api/jobs/${id}/events`)
    events.addEventListener('changed', () => {
      queryClient.invalidateQueries({ queryKey: ['job', id] })
      queryClient.invalidateQueries({ queryKey: ['variant', id] })
      queryClient.invalidateQueries({ queryKey: ['variant-munje', id] })
    })
    return () => events.close()
  }, [id, queryClient])

  const showMunje = variant && tab === 'munje'
  const [current, setCurrent] = useState(0)
  const [active, setActive] = useState<string | null>(null)
  const header = job?.header ?? ''
  const lines = (variant ? variantLines : job?.draft) ?? []
  const layout = useHaesolLayout(job?.id ?? '', header, lines, !!job && !showMunje)
  const cells = munjeCells(munje?.items ?? [])
  const pageCount = showMunje ? munjePageCount(cells) : layout.pages.length

  // 탭을 바꾸면 첫 쪽부터
  useEffect(() => {
    setCurrent(0)
    setActive(null)
  }, [tab])

  // 쪽이 줄면 마지막 쪽으로
  useEffect(() => {
    if (pageCount > 0 && current >= pageCount) setCurrent(pageCount - 1)
  }, [pageCount, current])

  if (isLoading) return <div className="page">불러오는 중...</div>
  if (error || !job) return <div className="page">없는 작업입니다</div>

  // 해설지에 나온 문항마다 쪽과 문항 정보를 붙인다 (문항 정보는 표시 번호 label 로 찾는다)
  const byLabel = new Map((job.problems ?? []).map((p) => [p.label ?? String(p.no), p]))
  const entries: ProblemEntry[] = showMunje
    ? cells.map((c) => ({ label: c.item.label, page: c.page, answer: null, review: null, hasFigure: false }))
    : layout.pages.flatMap((pg, page) =>
        pg.labels
          .filter((label) => layout.pages.findIndex((q) => q.labels.includes(label)) === page) // 여러 쪽에 걸친 문항은 첫 쪽에만
          .map((label) => {
            const p = byLabel.get(label)
            if (variant) return { label, page, ...variantEntry(lines, label), hasFigure: false }
            return { label, page, answer: p?.answer ?? null, review: p?.review ?? null, hasFigure: (p?.figures.length ?? 0) > 0 }
          }),
      )

  const renderPage = (index: number, picked: string | null = null) =>
    showMunje ? (
      <MunjePage title={munje?.title ?? ''} header={header} cells={cells} index={index} active={picked} />
    ) : (
      <HaesolPage jobId={job.id} header={header} layout={layout} index={index} active={picked} />
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

  const empty = showMunje ? !munje : lines.length === 0
  return (
    <div className="viewer">
      <div className="viewer-bar">
        <Link to={`/jobs/${job.id}`} className="button-plain">← 작업 상세</Link>
        <h1 className="viewer-title">{job.title}{variant && ' 변형문제'}</h1>
        {variant && (
          <div className="viewer-tabs" role="tablist" aria-label="변형문제 보기">
            <button type="button" role="tab" aria-selected={tab === 'munje'} className={tab === 'munje' ? 'on' : ''} onClick={() => setTab('munje')}>
              문제지
            </button>
            <button type="button" role="tab" aria-selected={tab === 'haesol'} className={tab === 'haesol' ? 'on' : ''} onClick={() => setTab('haesol')}>
              정답+해설
            </button>
          </div>
        )}
        <div className="viewer-downloads">
          {variant ? (
            <>
              <a className="button" href={variantUrl(job.id, 'munje')}>문제지 HWP 다운로드</a>
              <a className="button" href={variantUrl(job.id, 'haesol')}>정답+해설 HWP 다운로드</a>
            </>
          ) : <>
          {job.files.hwp && <a className="button" href={haesolUrl(job.id, 'hwp')}>HWP 다운로드</a>}
          {job.files.hwpx && <a className="button" href={haesolUrl(job.id, 'hwpx')}>HWPX 다운로드</a>}
          {job.problemCount > 0 && job.stage !== 'done' && (
            <>
              <a className="button" href={haesolDraftUrl(job.id, 'hwp')}>초안 HWP 다운로드</a>
              <a className="button" href={haesolDraftUrl(job.id, 'hwpx')}>초안 HWPX 다운로드</a>
            </>
          )}
          </>}
        </div>
      </div>
      {!variant && job.problemCount > 0 && job.stage !== 'done' && (
        <p className="hint">지금까지 저장된 풀이로 받습니다 · 안 푼 문항은 검토 필요: 풀이 누락으로 표시됩니다</p>
      )}
      {!showMunje && layout.measure}
      {empty ? (
        <p className="viewer-empty">{variant ? '아직 만든 변형문제가 없습니다' : '아직 저장된 풀이가 없습니다'}</p>
      ) : pageCount === 0 ? (
        <p className="viewer-empty">쪽을 나누는 중...</p>
      ) : (
        <div className="viewer-grid">
          <PageThumbs pageCount={pageCount} renderPage={(i) => renderPage(i)} current={current} entries={entries} onSelect={selectPage} />
          <PageStage pageCount={pageCount} renderPage={renderPage} current={current} active={active} onChange={selectPage} onPick={pickLabel} />
          <ProblemIndex entries={entries} pageCount={pageCount} current={current} active={active} hideAnswers={showMunje} onSelect={selectEntry} />
        </div>
      )}
    </div>
  )
}

// 변형문제 해설지 줄에서 문항의 답(머리 줄 `정답` 뒤)과 검토 필요 사유를 읽는다. 작업 문항 정보에는 변형문제가 없다
function variantEntry(lines: string[], label: string): { answer: string | null; review: string | null } {
  const labels = labelsOf(lines)
  const mine = lines.filter((_, i) => labels[i] === label)
  const head = mine.find((l) => HEAD.test(l))
  const review = mine.find((l) => l.startsWith('검토 필요'))
  return { answer: head?.split('정답 ')[1] ?? null, review: review?.replace(/^검토 필요:?\s*/, '') ?? null }
}
