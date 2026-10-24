import { useEffect, useRef, useState } from 'react'
import { figureUrl, pageImageUrl, type Job } from '../../shared/api'
import './OriginalPages.css'
import { loadRhwp } from '../../shared/hangulRenderer'

// 화면 위에서 30% 지점을 지난 마지막 쪽을 현재 쪽으로 알린다. 그만 볼 때 부를 정리 함수를 돌려준다
export function watchCurrentPage(box: HTMLElement, onChange: (page: number) => void): () => void {
  const onScroll = () => {
    const imgs = box.children
    const line = window.innerHeight * 0.3
    let now = 0
    for (let i = 0; i < imgs.length; i++) if (imgs[i].getBoundingClientRect().top <= line) now = i
    onChange(now)
  }
  onScroll()
  // 쪽 이미지를 불러와 상자 크기가 바뀌면 다시 잰다 (처음엔 이미지 높이가 0 이라 모든 쪽이 30% 지점을 지난 것으로 잰다)
  const resized = new ResizeObserver(onScroll)
  resized.observe(box)
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
  return () => {
    resized.disconnect()
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
  }
}

// 쪽 이미지 + 오른쪽 쪽 이동판 (PDF, 한글 공통)
function PageImages({ urls, name }: { urls: string[]; name: string }) {
  const box = useRef<HTMLDivElement>(null)
  const [cur, setCur] = useState(0)

  // 지금 보는 쪽을 따라간다
  useEffect(() => {
    if (box.current) return watchCurrentPage(box.current, setCur)
  }, [urls])

  const go = (i: number) => {
    const to = Math.min(Math.max(i, 0), urls.length - 1)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    box.current?.children[to]?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <div className="page-viewer">
      <div className="page-images" ref={box}>
        {urls.map((u, i) => (
          <img key={u} src={u} alt={`${name} ${i + 1}쪽`} />
        ))}
      </div>
      <nav className="page-nav" aria-label={`${name} 쪽 이동`}>
        <div className="page-nav-count">
          {cur + 1} / {urls.length}
        </div>
        <button type="button" aria-label="이전 쪽" disabled={cur === 0} onClick={() => go(cur - 1)}>
          ▲
        </button>
        {urls.map((u, i) => (
          <button
            key={u}
            type="button"
            aria-label={`${i + 1}쪽으로 이동`}
            aria-current={i === cur ? 'true' : undefined}
            onClick={() => go(i)}
          >
            {i + 1}
          </button>
        ))}
        <button type="button" aria-label="다음 쪽" disabled={cur === urls.length - 1} onClick={() => go(cur + 1)}>
          ▼
        </button>
      </nav>
    </div>
  )
}

type CellDoc = {
  getParaBounds(list: number, para: number): string
  getLineStarts(list: number, para: number): string
  insertTextAtCursor(list: number, para: number, pos: number, text: string): string
  deleteAtCursor(list: number, para: number, from: number, to: number): string
}

// reflowLinesegs 는 칸 한 겹만 다시 계산해 칸 속 상자(<보기>, 표 속 표)의 줄이 상자 끝에서 잘린다.
// 줄 배치가 없는 칸 문단에 글자 하나를 넣었다 지우면 rhwp 가 그 문단을 다시 계산한다. 목록 번호(칸)는 1부터 촘촘하다 (../Backend 오류 기록 050)
export function reflowNestedCells(doc: CellDoc): number {
  let fixed = 0
  for (let list = 1, miss = 0; miss < 20; list++) {
    if (doc.getParaBounds(list, 0) === '{}') {
      miss++
      continue
    }
    miss = 0
    for (let p = 0; doc.getParaBounds(list, p) !== '{}'; p++) {
      if (JSON.parse(doc.getParaBounds(list, p)).end > 0 && doc.getLineStarts(list, p) === '[]') {
        doc.insertTextAtCursor(list, p, 0, ' ')
        doc.deleteAtCursor(list, p, 0, 1)
        fixed++
      }
    }
  }
  return fixed
}

// rhwp 는 수식을 저장된 상자 폭에 맞춰 가로로 늘린다. 1.5배 넘게 늘어나면(어림 폭이 크게 틀린 수식) 한글처럼 제 크기로 그린다
export function unstretchEquations(svg: string): string {
  return svg.replace(/(<g transform="translate\([^)]*\) )scale\(([\d.]+),([\d.]+)\)/g, (m, head, sx, sy) =>
    Number(sx) > 1.5 ? `${head}scale(1,${sy})` : m,
  )
}

type HwpDoc = InstanceType<Awaited<ReturnType<typeof loadRhwp>>['HwpDocument']>

// 한글 파일(url)을 rhwp 로 쪽마다 SVG 이미지 주소로 만든다 (쪽끼리 SVG id 가 겹치지 않게 img 로 띄운다). url 이 null 이면 아무것도 안 한다.
// read 가 있으면 문서를 닫기 전에 불러 그 값(결과 문서 쪽별 번호 등)을 같이 돌려준다. version 이 바뀌면 다시 받는다
export function useHwpPages<T>(url: string | null, reflow: boolean, read?: (doc: HwpDoc) => T, version?: number) {
  const [state, setState] = useState<{ urls: string[]; data?: T } | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!url) return
    let alive = true
    let made: string[] = []
    setState(null)
    setError(false)
    Promise.all([loadRhwp(), fetch(url, { cache: 'no-store' }).then((res) => res.arrayBuffer())])
      .then(([core, buf]) => {
        const doc = new core.HwpDocument(new Uint8Array(buf))
        // 줄 배치를 비운 문단(결과 문서 미리보기 사본)은 rhwp 가 줄을 다시 나눈다. 원본 시험지는 한글이 저장한 줄 배치 그대로
        if (reflow) {
          doc.reflowLinesegs()
          reflowNestedCells(doc)
        }
        // 글상자 안쪽 영역 자르기는 뺀다: 한글은 글상자 안 개체(<보기> 테두리 상자)가 안쪽 여백을 넘어도 그대로 그린다 (경안고)
        made = Array.from({ length: doc.pageCount() }, (_, i) => {
          const svg = doc.renderPageSvg(i).replace(/ clip-path="url\(#textbox-clip-\d+\)"/g, '')
          return URL.createObjectURL(new Blob([reflow ? unstretchEquations(svg) : svg], { type: 'image/svg+xml' }))
        })
        const data = read?.(doc)
        doc.free()
        if (alive) setState({ urls: made, data })
        else made.forEach((u) => URL.revokeObjectURL(u))
      })
      .catch(() => alive && setError(true))
    return () => {
      alive = false
      made.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [url, reflow, read, version])

  return { urls: state?.urls ?? null, data: state?.data, error }
}

// 한글 파일(url)을 쪽마다 그려 오른쪽 쪽 이동판과 보인다 (원본 시험지, 작업 상세의 결과 문서 보기)
export function HwpPages({ url, name, reflow = false }: { url: string; name: string; reflow?: boolean }) {
  const { urls, error } = useHwpPages(url, reflow)
  if (error) return <p className="error">{name}를 그리지 못했습니다</p>
  if (!urls) return <p className="job-meta">{name}를 그리는 중...</p>
  return <PageImages urls={urls} name={name} />
}

// 원본 시험지 (접기/펼치기). 기본은 접어 둔다 (쪽이 많으면 화면이 길어지고 그리는 데 오래 걸려서, 2026-09-29 요청)
export function OriginalPages({ job }: { job: Job }) {
  const [open, setOpen] = useState(false)

  // HML 작업은 쪽 이미지도 원본 미리보기도 없다
  if (job.inputType === 'HML') return null

  return (
    <section className="original-pages">
      <button type="button" className="button-plain" onClick={() => setOpen(!open)}>
        {open ? '▼' : '▶'} 원본 시험지
      </button>
      {/* 정답 쪽은 준비 단계에서 뺀다. 글자층이 없는 스캔본은 못 거른다 */}
      {job.answerPages && job.answerPages.length > 0 && (
        <p className="job-meta">정답 쪽(원본 {job.answerPages.join(', ')}쪽)은 모델에게 보내지 않습니다.</p>
      )}
      {job.textLayer === false && (
        <p className="job-meta">스캔본이라 정답 쪽을 자동으로 거를 수 없습니다. 정답 쪽은 쪽 범위에서 빼고 올려 주세요.</p>
      )}
      {open && job.inputType === 'PDF' && (
        // 쪽 번호는 1부터 pages 까지 (백엔드가 고른 쪽만 모아 1쪽부터 다시 매김)
        <PageImages name="원본 시험지" urls={Array.from({ length: job.pages }, (_, i) => pageImageUrl(job.id, i + 1))} />
      )}
      {open && job.inputType === 'HWPX' && <HwpPages name="원본 시험지" url={figureUrl(job.id, 'view.hwpx')} />}
      {open && job.inputType === 'HWP' && <HwpPages name="원본 시험지" url={figureUrl(job.id, 'source.hwp')} />}
    </section>
  )
}
