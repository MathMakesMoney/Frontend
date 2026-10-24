import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { academyUrl, fetchJob, fetchVariantLines, fetchVariantMunje, haesolDraftUrl, haesolUrl, variantUrl } from '../../../shared/api'
import { HEAD, HaesolPage, labelsOf, useHaesolLayout } from '../haesolPages'
import { stageSrc, useHwpPages } from '../OriginalPages'
import { resultTabs } from '../resultTabs'
import { MunjePage, munjeCells, munjePageCount } from './MunjePage'
import { PageThumbs } from './PageThumbs'
import { PageStage } from './PageStage'
import { ProblemIndex } from './ProblemIndex'
import { academyIndex, academyPages } from './academyIndex'
import { EquationLayer } from './EquationLayer'
import type { ProblemEntry } from './types'
import './viewer.css'

// 결과물 보기: 해설지 탭은 왼쪽 쪽 썸네일, 가운데 쪽 한 장, 오른쪽 쪽별 문항 목록 (타이퍼랩 문제 편집 화면 모양, 수정은 없음).
// 결과 문서 파일이 있으면 [결과 문서] 탭: 미리보기 사본을 rhwp 로 쪽마다 그려 같은 3칸에 넣는다. 문항 목록은 쪽마다 번호 칸 글자로 (academyIndex). 타이핑만 한 작업은 이 탭만 있다
// variant 면 변형문제: [문제지] 탭(처음, variant/munje.json 을 한글 문제지와 같은 2단 4칸으로, 정답 숨김)과
// [정답+해설] 탭(variant/haesol.txt 를 해설지와 같은 모양으로)
export function HaesolViewerPage({ variant = false }: { variant?: boolean }) {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'munje' | 'haesol'>('munje')
  const { data: job, dataUpdatedAt, isLoading, error } = useQuery({
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

  const [resultTab, setResultTab] = useState<'haesol' | 'academy'>('haesol')
  const tabs = job && !variant ? resultTabs(job) : []
  const showAcademy = tabs.includes('academy') && (resultTab === 'academy' || !tabs.includes('haesol'))
  const showMunje = variant && tab === 'munje'
  const [current, setCurrent] = useState(0)
  const [active, setActive] = useState<string | null>(null)
  const [listPicks, setListPicks] = useState(0) // 목록에서 문항을 누른 횟수
  const [hovered, setHovered] = useState<string | null>(null) // 오른쪽 목록에서 마우스를 올린 문항
  const header = job?.header ?? ''
  const lines = (variant ? variantLines : job?.draft) ?? []
  const layout = useHaesolLayout(job?.id ?? '', header, lines, !!job && !showMunje && !showAcademy)
  const cells = munjeCells(munje?.items ?? [])
  // 작업을 다시 받을 때마다(SSE changed) 결과 문서도 새로 받아 그린다. 수식은 해설지 탭과 같은 웹 수식으로 겹쳐 그린다 (EquationLayer)
  const academy = useHwpPages(job && showAcademy ? academyUrl(job.id, 'view') : null, true, academyPages, dataUpdatedAt, true)
  const pageCount = showMunje ? munjePageCount(cells) : showAcademy ? (academy.urls?.length ?? 0) : layout.pages.length

  // 탭을 바꾸면 첫 쪽부터
  useEffect(() => {
    setCurrent(0)
    setActive(null)
    setHovered(null)
  }, [tab, resultTab])

  // 쪽이 줄면 마지막 쪽으로
  useEffect(() => {
    if (pageCount > 0 && current >= pageCount) setCurrent(pageCount - 1)
  }, [pageCount, current])

  if (isLoading) return <div className="page">불러오는 중...</div>
  if (error || !job) return <div className="page">없는 작업입니다</div>

  // 해설지에 나온 문항마다 쪽과 문항 정보를 붙인다 (문항 정보는 표시 번호 label 로 찾는다)
  const byLabel = new Map((job.problems ?? []).map((p) => [p.label ?? String(p.no), p]))
  const academyIdx = showAcademy && academy.data ? academyIndex(academy.data, job.problems ?? [], job.features) : null
  const entries: ProblemEntry[] = academyIdx
    ? academyIdx.entries
    : showAcademy
    ? []
    : showMunje
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

  // 결과 문서 쪽 그림 위에 웹 수식, 그 위에 문항 자리를 겹친다 (해설지 쪽의 data-label 문항 덩어리 역할).
  // 썸네일은 picked 를 안 넘겨 겹치지 않고 rhwp 수식이 든 쪽 그림 그대로
  const renderPage = (index: number, picked?: string | null) =>
    showAcademy ? (
      <div className="academy-sheet">
        <img
          className="academy-page"
          src={stageSrc(academy, index, picked)}
          alt={`결과 문서 ${index + 1}쪽`}
        />
        {picked !== undefined && academy.equations && <EquationLayer eqs={academy.equations[index]} />}
        {picked !== undefined &&
          entries.map(
            (e) =>
              e.page === index &&
              e.box && (
                <div
                  key={e.label}
                  data-label={e.label}
                  className={`academy-box${e.label === picked ? ' haesol-active' : ''}`}
                  style={{ left: e.box.x, top: e.box.y, width: e.box.w, height: e.box.h }}
                />
              ),
          )}
      </div>
    ) : showMunje ? (
      <MunjePage title={munje?.title ?? ''} header={header} cells={cells} index={index} active={picked ?? null} />
    ) : (
      <HaesolPage jobId={job.id} header={header} layout={layout} index={index} active={picked ?? null} />
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
    setListPicks((n) => n + 1)
  }

  const empty = showAcademy ? false : showMunje ? !munje : lines.length === 0
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
        {tabs.includes('academy') && (
          <div className="viewer-tabs" role="tablist" aria-label="결과물 보기">
            {tabs.includes('haesol') && (
              <button type="button" role="tab" aria-selected={!showAcademy} className={!showAcademy ? 'on' : ''} onClick={() => setResultTab('haesol')}>
                해설지
              </button>
            )}
            <button type="button" role="tab" aria-selected={showAcademy} className={showAcademy ? 'on' : ''} onClick={() => setResultTab('academy')}>
              결과 문서
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
      {!variant && !showAcademy && job.problemCount > 0 && job.stage !== 'done' && (
        <p className="hint">미리보기는 푼 문항만 보입니다 · 초안 다운로드는 안 푼 문항을 검토 필요: 풀이 누락으로 넣어 받습니다</p>
      )}
      {!showMunje && !showAcademy && layout.measure}
      {showAcademy && academy.error ? (
        <p className="viewer-empty">결과 문서를 그리지 못했습니다</p>
      ) : empty ? (
        <p className="viewer-empty">{variant ? '아직 만든 변형문제가 없습니다' : '아직 저장된 풀이가 없습니다'}</p>
      ) : pageCount === 0 ? (
        <p className="viewer-empty">{showAcademy ? '결과 문서를 그리는 중...' : '쪽을 나누는 중...'}</p>
      ) : (
        <div className="viewer-grid">
          <PageThumbs pageCount={pageCount} renderPage={(i) => renderPage(i)} current={current} entries={entries} notes={academyIdx?.notes} onSelect={selectPage} />
          <PageStage pageCount={pageCount} renderPage={renderPage} current={current} active={active} hovered={hovered} listPicks={listPicks} onChange={selectPage} onPick={pickLabel} />
          <ProblemIndex entries={entries} pageCount={pageCount} current={current} active={active} hideAnswers={showMunje} readFailed={showAcademy && academy.readFailed} onSelect={selectEntry} onHover={setHovered} />
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
