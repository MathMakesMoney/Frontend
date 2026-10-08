import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PageStageProps } from './types'
import './PageStage.css'

const PAGE_W = 794 // .preview-page 고정 크기
const PAGE_H = 1123
const PAD = 24
const MIN = 0.3
const MAX = 2

const clamp = (v: number) => Math.min(MAX, Math.max(MIN, v))

// 가운데 칸: 모든 쪽을 세로로 이어 붙여 스크롤로 넘긴다. 화면에 걸친 쪽이 지금 쪽(current)이 되고,
// 다른 칸에서 쪽·문항을 고르면 그 자리로 스크롤한다. 확대·축소, ←/→ 로 앞뒤 쪽
export function PageStage({ pageCount, renderPage, current, active, onChange, onPick }: PageStageProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const reported = useRef(current) // 스크롤로 알린 쪽: 이 값으로 current 가 바뀌면 다시 스크롤하지 않는다
  const picked = useRef<string | null>(null) // 쪽 위에서 눌러 고른 문항: 이미 보고 있으니 스크롤하지 않는다
  const [width, setWidth] = useState(0)
  const [zoom, setZoom] = useState<number | null>(null) // null 이면 폭 맞춤
  const count = pageCount

  // 칸 폭 재기
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const fit = clamp((width - PAD * 2) / PAGE_W)
  const scale = zoom ?? fit

  // 스크롤하면 칸 위쪽 40% 선에 걸친 쪽을 지금 쪽으로 알린다
  function onScroll() {
    const el = scroller.current
    if (!el) return
    const line = el.getBoundingClientRect().top + el.clientHeight * 0.4
    let page = 0
    el.querySelectorAll<HTMLElement>('[data-page]').forEach((box, i) => {
      if (box.getBoundingClientRect().top <= line) page = i
    })
    if (page !== reported.current) {
      reported.current = page
      onChange(page)
    }
  }

  // 다른 칸에서 고르면 그 자리로: 문항을 골랐으면 문항, 아니면 쪽 맨 위
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    if (active && active === picked.current) {
      // 쪽 위에서 누른 문항: 그 자리 그대로
    } else if (active) {
      el.querySelector(`[data-label="${CSS.escape(active)}"]`)?.scrollIntoView({ block: 'center' })
    } else if (current !== reported.current) {
      el.querySelector(`[data-page="${current}"]`)?.scrollIntoView({ block: 'start' })
    }
    reported.current = current
    picked.current = null // 다음에 목록에서 고르면 다시 스크롤
  }, [active, current])

  // ←/→ 로 앞뒤 쪽 (입력 중엔 제외. 위아래 스크롤·PageUp/Down 은 브라우저 기본 동작)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (e.key === 'ArrowLeft' && current > 0) onChange(current - 1)
      else if (e.key === 'ArrowRight' && current < count - 1) onChange(current + 1)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, count, onChange])

  // 쪽 위의 문항을 누르면 그 문항을 고른다
  function onClick(e: React.MouseEvent) {
    const label = (e.target as Element).closest<HTMLElement>('[data-label]')?.dataset.label
    if (!label) return
    picked.current = label
    onPick(label)
  }

  const step = (d: number) => setZoom(clamp(Math.round((scale + d) * 10) / 10))

  return (
    <div className="page-stage">
      <div className="page-stage-scroll" ref={scroller} onScroll={onScroll} onClick={onClick}>
        {Array.from({ length: pageCount }, (_, i) => (
          <div key={i} data-page={i} className="page-stage-box" style={{ width: PAGE_W * scale, height: PAGE_H * scale }}>
            <div className="page-stage-inner" style={{ transform: `scale(${scale})` }}>
              {renderPage(i, active)}
            </div>
          </div>
        ))}
      </div>

      <div className="page-stage-zoom">
        <span className="page-stage-count">
          {current + 1} / {count}쪽
        </span>
        <button type="button" aria-label="축소" disabled={scale <= MIN} onClick={() => step(-0.1)}>
          −
        </button>
        <span>{Math.round(scale * 100)}%</span>
        <button type="button" aria-label="확대" disabled={scale >= MAX} onClick={() => step(0.1)}>
          +
        </button>
        <button type="button" aria-label="화면에 맞춤" className={zoom === null ? 'on' : ''} onClick={() => setZoom(null)}>
          ⤢
        </button>
      </div>
    </div>
  )
}
