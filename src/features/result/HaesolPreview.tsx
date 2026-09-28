import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { figureUrl } from '../../shared/api'
import { RichText } from '../../shared/RichText'

// 해설지 한 줄: 제목·문항 머리·풀이 줄·그림·검토 필요·빈 줄
function Line({ jobId, text }: { jobId: string; text: string }) {
  const fig = text.match(/^\[그림파일:(.+)\]$/)
  if (fig) return <img className="haesol-fig" src={figureUrl(jobId, fig[1])} alt="문항 그림" />
  if (text.trim() === '') return <div className="haesol-gap" />
  if (/^\d+번/.test(text)) return <div className="haesol-head"><RichText text={text} /></div>
  if (text.startsWith('검토 필요')) return <div className="haesol-review"><RichText text={text} /></div>
  return <div className="haesol-line"><RichText text={text} /></div>
}

// 줄들을 쪽마다 나눈다: 쪽 본문(2단, 왼쪽 단부터 채움)이 넘쳐 셋째 단이 생기면 그 줄부터 다음 쪽
// 줄 복사본: 그림은 원본의 실제 크기를 적어 두어 복사본이 로드되기 전에도 높이가 맞게 잡히게 한다
function copy(line: Element): Node {
  const out = line.cloneNode(true) as Element
  const img = line instanceof HTMLImageElement ? line : null
  if (img && out instanceof HTMLImageElement) {
    out.width = img.naturalWidth
    out.height = img.naturalHeight
  }
  return out
}

async function paginate(source: HTMLElement, page: HTMLElement): Promise<number[]> {
  await Promise.all([...source.querySelectorAll('img')].map((img) => img.decode().catch(() => undefined)))
  const starts = [0]
  page.replaceChildren()
  const lines = [...source.children]
  lines.forEach((line, i) => {
    page.appendChild(copy(line))
    if (page.scrollWidth > page.clientWidth + 1 && page.children.length > 1) {
      starts.push(i)
      page.replaceChildren(copy(line))
    }
  })
  return starts
}

// 해설지 미리보기: 받을 해설지와 같은 내용(글·그림·검토 필요)을 A4 2단으로 그린다. 수식은 KaTeX
// 한글 파일 렌더러(@rhwp/core)는 키 큰 수식·긴 수식에서 줄이 겹치고 쪽 끝이 잘려 쓰지 않는다
// 쪽마다 위에 머리말(시험 정보), 아래에 쪽 번호를 단다
export function HaesolPreview({ jobId, version, header }: { jobId: string; version: string; header: string }) {
  const [open, setOpen] = useState(false)
  const [lines, setLines] = useState<string[] | null>(null)
  const [starts, setStarts] = useState<number[]>([])
  const [error, setError] = useState('')
  const source = useRef<HTMLDivElement>(null)
  const measure = useRef<HTMLDivElement>(null)

  // 열거나 해설지가 다시 만들어지면 해설지 글을 새로 받는다
  useEffect(() => {
    if (!open) return
    let alive = true
    setLines(null)
    setError('')
    fetch(figureUrl(jobId, 'haesol_pdf.txt'), { cache: 'no-store' })
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error('해설지를 받지 못했습니다'))))
      .then((text) => alive && setLines(text.split('\n')))
      .catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [jobId, open, version])

  // 줄을 그린 뒤 쪽 나누기
  useLayoutEffect(() => {
    if (!lines || !source.current || !measure.current) return
    let alive = true
    paginate(source.current, measure.current).then((s) => alive && setStarts(s))
    return () => {
      alive = false
    }
  }, [lines])

  const pages = starts.map((s, i) => (lines ?? []).slice(s, starts[i + 1]))

  return (
    <section className="haesol-preview">
      <button type="button" className="button-plain" onClick={() => setOpen(!open)}>
        {open ? '▼' : '▶'} 해설지 미리보기
      </button>
      {error && <p className="error">{error}</p>}
      {open && !error && !lines && <p className="job-meta">해설지를 불러오는 중...</p>}
      {open && lines && (
        <div className="preview-pages">
          <p className="job-meta">{pages.length}쪽 · 내용은 받을 파일과 같고, 글꼴과 쪽 나뉘는 위치는 한글 프로그램과 조금 다를 수 있습니다</p>
          {/* 쪽 나누기 계산용 (화면에 안 보임) */}
          <div className="haesol-measure" aria-hidden>
            <div ref={source} className="haesol-source">
              {lines.map((l, i) => <Line key={i} jobId={jobId} text={l} />)}
            </div>
            <div className="preview-page">
              <div className="haesol-header">{header}</div>
              <div ref={measure} className="haesol-body" />
              <div className="haesol-footer">- 1 -</div>
            </div>
          </div>
          {pages.map((page, p) => (
            <div key={p} className="preview-page">
              <div className="haesol-header">{header}</div>
              <div className="haesol-body">
                {page.map((l, i) => <Line key={i} jobId={jobId} text={l} />)}
              </div>
              <div className="haesol-footer">- {p + 1} -</div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
