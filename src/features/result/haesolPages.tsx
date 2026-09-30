import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { figureUrl } from '../../shared/api'
import { RichText } from '../../shared/RichText'

// 해설지 줄(draft)을 A4 2단 쪽으로 나누고 그리는 부품. 해설지 보기(viewer/)가 쓴다

// 문항 머리 줄: `{label}번  정답 {answer}`, 서술형은 `서술형 1  정답 {answer}` (번 없음). label 은 20-1, 서술형 1-2 같은 모양도 있다
export const HEAD = /^(?:(\S+)번|(서술형 \d+(?:-\d+)?))  정답/

// 해설지 한 줄: 제목·문항 머리·풀이 줄·그림·검토 필요·빈 줄. isNew 면 방금 들어온 문항이라 잠깐 강조
function Line({ jobId, text, isNew }: { jobId: string; text: string; isNew?: boolean }) {
  const mark = isNew ? ' haesol-new' : ''
  const fig = text.match(/^\[그림파일:(.+)\]$/)
  if (fig) return <img className={`haesol-fig${mark}`} src={figureUrl(jobId, fig[1])} alt="문항 그림" />
  if (text.trim() === '') return <div className="haesol-gap" />
  if (HEAD.test(text)) return <div className={`haesol-head${mark}`}><RichText text={text} display /></div>
  if (text.startsWith('검토 필요')) return <div className={`haesol-review${mark}`}><RichText text={text} display /></div>
  return <div className={`haesol-line${mark}`}><RichText text={text} display /></div>
}

// 줄마다 속한 문항 label (제목 줄은 '')
export function labelsOf(lines: string[]): string[] {
  let label = ''
  return lines.map((l) => (label = l.match(HEAD)?.slice(1).find(Boolean) ?? label))
}

// 쪽 나누기 단위(줄 번호 묶음): 문항 하나(머리 줄부터 다음 문항 앞까지)를 한 덩어리로 묶어 단·쪽 중간에서 끊기지 않게 한다
// split 에 든 문항(머리 줄 번호)은 한 쪽에도 안 들어가 줄마다 나눈다. 이때도 머리 줄은 다음 줄과 묶어 머리만 단 끝에 남지 않게 한다
export function blocksOf(lines: string[], split: ReadonlySet<number> = new Set()): number[][] {
  const blocks: number[][] = []
  for (let i = 0; i < lines.length; i++) {
    if (!HEAD.test(lines[i])) {
      blocks.push([i]) // 첫 문항 앞 제목 줄
      continue
    }
    let end = i + 1
    while (end < lines.length && !HEAD.test(lines[end])) end++
    if (split.has(i)) {
      blocks.push(i + 1 < end ? [i, i + 1] : [i])
      for (let j = i + 2; j < end; j++) blocks.push([j])
    } else {
      blocks.push(Array.from({ length: end - i }, (_, k) => i + k))
    }
    i = end - 1
  }
  return blocks
}

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

// 덩어리들을 쪽마다 나눈다: 쪽 본문(2단, 왼쪽 단부터 채움)이 넘쳐 셋째 단이 생기면 그 덩어리부터 다음 쪽
// 1쪽은 제목 칸만큼 본문이 낮아 first 로 재고, 둘째 쪽부터 page 로 잰다
// 혼자서도 한 쪽을 넘치는 덩어리는 tooBig 으로 알린다 (줄마다 나눠 다시 계산)
async function paginate(source: HTMLElement, first: HTMLElement, rest: HTMLElement): Promise<{ starts: number[]; tooBig: number[] }> {
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
  const tooBig: number[] = []
  let page = first
  const overflow = () => page.scrollWidth > page.clientWidth + 1
  first.replaceChildren()
  rest.replaceChildren()
  const lines = [...source.children]
  lines.forEach((line, i) => {
    page.appendChild(copy(line))
    if (overflow() && page.children.length > 1) {
      starts.push(i)
      page.lastChild?.remove()
      page = rest
      page.replaceChildren(copy(line))
    }
    if (overflow()) tooBig.push(i)
  })
  return { starts, tooBig }
}

// 쪽 하나: 덩어리 번호 목록(blocks 의 부분)과 그 쪽에 나오는 문항 label (나온 순서, 중복 없음)
export interface HaesolPageData {
  blocks: number[][]
  labels: string[]
}

export interface HaesolLayout {
  title: string // 1쪽 맨 위에 크게 쓰는 해설지 제목 (해설지 첫 줄). 본문에서는 뺀다
  lines: string[]
  labels: string[] // 줄마다 속한 문항 label
  pages: HaesolPageData[]
  measure: ReactNode // 쪽 나누기 계산용 숨은 DOM. 화면 어딘가에 한 번 그려야 pages 가 채워진다
}

// 해설지 줄을 쪽으로 나눈다. enabled 가 false 면 계산하지 않는다 (접힌 미리보기)
export function useHaesolLayout(jobId: string, header: string, lines: string[], enabled = true): HaesolLayout {
  const labels = labelsOf(lines)
  const [split, setSplit] = useState<ReadonlySet<number>>(new Set()) // 줄마다 나눌 문항 (머리 줄 번호)
  // 첫 줄이 문항이 아니면 해설지 제목: 본문 덩어리에서 빼고 1쪽 머리에 따로 그린다 (한글 해설지 파일과 같은 모양)
  const title = lines.length > 0 && lines[0].trim() !== '' && !HEAD.test(lines[0]) ? lines[0] : ''
  const blocks = blocksOf(lines, split).filter((b) => !(title && b.length === 1 && b[0] === 0))
  const [starts, setStarts] = useState<number[]>([])
  const source = useRef<HTMLDivElement>(null)
  const measureFirst = useRef<HTMLDivElement>(null)
  const measureBody = useRef<HTMLDivElement>(null)

  // 줄이 바뀌거나 켜지면 쪽 나누기를 다시 한다. 한 쪽을 넘는 문항이 나오면 그 문항만 줄마다 나눠 다시 계산
  useLayoutEffect(() => {
    if (!enabled || !source.current || !measureFirst.current || !measureBody.current) return
    let alive = true
    paginate(source.current, measureFirst.current, measureBody.current).then(({ starts, tooBig }) => {
      if (!alive) return
      const heads = tooBig.map((b) => blocks[b]).filter((b) => b.length > 2 && HEAD.test(lines[b[0]])).map((b) => b[0])
      if (heads.length > 0) setSplit(new Set([...split, ...heads]))
      else setStarts(starts)
    })
    return () => {
      alive = false
    }
  }, [lines, enabled, split])

  const pages = starts.map((s, i) => {
    const pageBlocks = blocks.slice(s, starts[i + 1])
    const pageLabels = [...new Set(pageBlocks.flat().map((l) => labels[l]).filter((l) => l !== ''))]
    return { blocks: pageBlocks, labels: pageLabels }
  })

  const measure = enabled ? (
    <div className="haesol-measure" aria-hidden>
      <div ref={source} className="haesol-source">
        {blocks.map((b, i) => (
          <Block key={i} jobId={jobId} lines={lines} labels={labels} block={b} />
        ))}
      </div>
      <div className="preview-page">
        <PageHead title={title} header={header} first />
        <div ref={measureFirst} className={`haesol-body${title ? ' first' : ''}`} />
        <div className="haesol-footer">- 1 -</div>
      </div>
      <div className="preview-page">
        <PageHead title={title} header={header} first={false} />
        <div ref={measureBody} className="haesol-body" />
        <div className="haesol-footer">- 2 -</div>
      </div>
    </div>
  ) : null

  return { title, lines, labels, pages, measure }
}

// 쪽 머리: 1쪽은 큰 굵은 제목과 그 아래 시험 정보 줄(머리말과 같은 모양), 둘째 쪽부터는 머리말만
function PageHead({ title, header, first }: { title: string; header: string; first: boolean }) {
  return (
    <>
      {first && title && <div className="haesol-title">{title}</div>}
      <div className="haesol-header">{header}</div>
    </>
  )
}

// 덩어리 하나를 한 요소로 감싸 단·쪽이 함께 넘어가게 한다. data-label 로 문항 위치를 찾는다 (해설지 보기에서 문항으로 이동)
function Block({ jobId, lines, labels, block, fresh, active }: {
  jobId: string
  lines: string[]
  labels: string[]
  block: number[]
  fresh?: Set<string>
  active?: string | null
}) {
  const label = labels[block[0]]
  return (
    <div className={`haesol-keep${active && label === active ? ' haesol-active' : ''}`} data-label={label || undefined}>
      {block.map((i) => (
        <Line key={i} jobId={jobId} text={lines[i]} isNew={fresh?.has(labels[i])} />
      ))}
    </div>
  )
}

// A4 한 쪽 (794x1123px): 머리말, 2단 본문, 쪽 번호. fresh 는 강조할 문항, active 는 표시할(고른) 문항
export function HaesolPage({ jobId, header, layout, index, fresh, active }: {
  jobId: string
  header: string
  layout: HaesolLayout
  index: number
  fresh?: Set<string>
  active?: string | null
}) {
  return (
    <div className="preview-page">
      <PageHead title={layout.title} header={header} first={index === 0} />
      <div className={`haesol-body${index === 0 && layout.title ? ' first' : ''}`}>
        {layout.pages[index].blocks.map((b, i) => (
          <Block key={i} jobId={jobId} lines={layout.lines} labels={layout.labels} block={b} fresh={fresh} active={active} />
        ))}
      </div>
      <div className="haesol-footer">- {index + 1} -</div>
    </div>
  )
}
