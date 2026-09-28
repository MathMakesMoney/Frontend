import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { figureUrl } from '../../shared/api'
import { RichText } from '../../shared/RichText'

// 문항 머리 줄: `{label}번  정답 {answer}`. label 은 20-1 같은 모양도 있다
const HEAD = /^(\S+)번  정답/

// 해설지 한 줄: 제목·문항 머리·풀이 줄·그림·검토 필요·빈 줄. isNew 면 방금 들어온 문항이라 잠깐 강조
function Line({ jobId, text, isNew }: { jobId: string; text: string; isNew?: boolean }) {
  const mark = isNew ? ' haesol-new' : ''
  const fig = text.match(/^\[그림파일:(.+)\]$/)
  if (fig) return <img className={`haesol-fig${mark}`} src={figureUrl(jobId, fig[1])} alt="문항 그림" />
  if (text.trim() === '') return <div className="haesol-gap" />
  if (HEAD.test(text)) return <div className={`haesol-head${mark}`}><RichText text={text} /></div>
  if (text.startsWith('검토 필요')) return <div className={`haesol-review${mark}`}><RichText text={text} /></div>
  return <div className={`haesol-line${mark}`}><RichText text={text} /></div>
}

// 줄마다 속한 문항 label (제목 줄은 '')
function labelsOf(lines: string[]): string[] {
  let label = ''
  return lines.map((l) => (label = l.match(HEAD)?.[1] ?? label))
}

// 쪽 나누기 단위(줄 번호 묶음): 문항 머리 줄은 다음 줄(그림이나 첫 풀이 줄)과 한 덩어리로 묶어 머리만 단 끝에 남지 않게 한다
function blocksOf(lines: string[]): number[][] {
  const blocks: number[][] = []
  for (let i = 0; i < lines.length; i++) {
    blocks.push(HEAD.test(lines[i]) && i + 1 < lines.length ? [i, ++i] : [i])
  }
  return blocks
}

// 덩어리들을 쪽마다 나눈다: 쪽 본문(2단, 왼쪽 단부터 채움)이 넘쳐 셋째 단이 생기면 그 덩어리부터 다음 쪽
// 덩어리 복사본: 그림은 원본의 실제 크기를 적어 두어 복사본이 로드되기 전에도 높이가 맞게 잡히게 한다
function copy(line: Element): Node {
  const out = line.cloneNode(true) as Element
  const to = out.querySelectorAll('img')
  line.querySelectorAll('img').forEach((img, i) => {
    to[i].width = img.naturalWidth
    to[i].height = img.naturalHeight
  })
  return out
}

async function paginate(source: HTMLElement, page: HTMLElement): Promise<number[]> {
  // 그림 크기를 알 때까지 기다린다 (decode 는 화면 밖 숨긴 그림에서 끝나지 않아 load 로 본다)
  await Promise.all(
    [...source.querySelectorAll('img')].map((img) =>
      img.complete
        ? undefined
        : new Promise((done) => {
            img.addEventListener('load', done, { once: true })
            img.addEventListener('error', done, { once: true })
          }),
    ),
  )
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

// 해설지 미리보기: 지금까지 저장된 풀이로 만든 해설지 줄(draft)을 A4 2단으로 그린다. 수식은 KaTeX
// 한글 파일 렌더러(@rhwp/core)는 우리가 만든 해설지(줄 배치 정보 없음)에서 줄이 겹치고 쪽 끝이 잘려 쓰지 않는다
// 쪽마다 위에 머리말(시험 정보), 아래에 쪽 번호를 단다. 새로 들어온 문항은 2초 강조
export function HaesolPreview({ jobId, header, lines, progress }: { jobId: string; header: string; lines: string[]; progress: string }) {
  const labels = labelsOf(lines)
  const blocks = blocksOf(lines)
  const solved = labels.some((l) => l !== '')
  // 강사가 누르기 전에는 푼 문항이 있으면 펼친다
  const [userOpen, setUserOpen] = useState<boolean | null>(null)
  const open = userOpen ?? solved
  const [starts, setStarts] = useState<number[]>([])
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const seen = useRef(new Set(labels))
  const source = useRef<HTMLDivElement>(null)
  const measure = useRef<HTMLDivElement>(null)

  // 처음 보는 문항 label 만 강조한다 (같은 내용으로 다시 받아도 다시 강조하지 않는다)
  useEffect(() => {
    const added = labelsOf(lines).filter((l) => l !== '' && !seen.current.has(l))
    added.forEach((l) => seen.current.add(l))
    if (added.length > 0) setFresh(new Set(added))
  }, [lines])

  // 강조는 2초 뒤 푼다
  useEffect(() => {
    if (fresh.size === 0) return
    const timer = setTimeout(() => setFresh(new Set()), 2000)
    return () => clearTimeout(timer)
  }, [fresh])

  // 줄이 바뀌거나 펼치면 쪽 나누기를 다시 한다
  useLayoutEffect(() => {
    if (!open || !source.current || !measure.current) return
    let alive = true
    paginate(source.current, measure.current).then((s) => alive && setStarts(s))
    return () => {
      alive = false
    }
  }, [lines, open])

  const pages = starts.map((s, i) => blocks.slice(s, starts[i + 1]))
  // 덩어리 하나를 한 요소로 감싸 단·쪽이 함께 넘어가게 한다
  const block = (b: number[], key: number, mark: boolean) => (
    <div key={key} className="haesol-keep">
      {b.map((i) => <Line key={i} jobId={jobId} text={lines[i]} isNew={mark && fresh.has(labels[i])} />)}
    </div>
  )

  return (
    <section className="haesol-preview">
      <button type="button" className="button-plain" onClick={() => setUserOpen(!open)}>
        {open ? '▼' : '▶'} 해설지 미리보기{progress && ` (${progress})`}
      </button>
      {open && (
        <div className="preview-pages">
          <p className="job-meta">{pages.length}쪽 · 내용은 받을 파일과 같고, 글꼴과 쪽 나뉘는 위치는 한글 프로그램과 조금 다를 수 있습니다</p>
          {/* 쪽 나누기 계산용 (화면에 안 보임) */}
          <div className="haesol-measure" aria-hidden>
            <div ref={source} className="haesol-source">
              {blocks.map((b, i) => block(b, i, false))}
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
                {page.map((b, i) => block(b, i, true))}
              </div>
              <div className="haesol-footer">- {p + 1} -</div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
