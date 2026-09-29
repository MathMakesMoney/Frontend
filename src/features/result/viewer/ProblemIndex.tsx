import { useEffect, useMemo, useRef, useState } from 'react'
import { labelText } from '../../../shared/labelText'
import { RichText } from '../../../shared/RichText'
import type { ProblemEntry, ProblemIndexProps } from './types'
import './ProblemIndex.css'

// 오른쪽 칸: 쪽별로 묶은 문항 목록 (보기 전용)
export function ProblemIndex({ entries, pageCount, current, active, onSelect }: ProblemIndexProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [closed, setClosed] = useState<Set<number>>(new Set()) // 접힌 쪽 (기본은 모두 펼침)

  const groups = useMemo(() => {
    const byPage: ProblemEntry[][] = Array.from({ length: pageCount }, () => [])
    for (const e of entries) byPage[e.page]?.push(e)
    return byPage.map((list, page) => ({ page, list })).filter((g) => g.list.length > 0)
  }, [entries, pageCount])

  const reviewCount = entries.filter((e) => e.review != null).length

  // 고른 문항(없으면 현재 쪽 머리)이 칸 안에서 보이게
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const target =
      (active != null && root.querySelector(`[data-label="${CSS.escape(active)}"]`)) ||
      root.querySelector(`[data-page="${current}"]`)
    target?.scrollIntoView({ block: 'nearest' })
  }, [active, current, closed])

  const toggle = (page: number) =>
    setClosed((prev) => {
      const next = new Set(prev)
      if (!next.delete(page)) next.add(page)
      return next
    })

  return (
    <div className="viewer-panel pindex" ref={rootRef}>
      <div className="pindex-head">
        <strong>문항 목록</strong>
        <span className="pindex-count">{entries.length}문항</span>
        {reviewCount > 0 && <span className="pindex-badge">검토 필요 {reviewCount}</span>}
      </div>
      {groups.map(({ page, list }) => {
        const open = !closed.has(page)
        return (
          <section key={page} className={`pindex-group${page === current ? ' current' : ''}`}>
            <div className="pindex-group-head" data-page={page}>
              <button
                type="button"
                className="pindex-chevron"
                aria-expanded={open}
                aria-label={`${page + 1}쪽 문항 ${open ? '접기' : '펼치기'}`}
                onClick={() => toggle(page)}
              >
                {open ? '▾' : '▸'}
              </button>
              <span className="pindex-group-title">{page + 1}쪽</span>
              <span className="pindex-count">{list.length}문항</span>
            </div>
            {open && (
              <div className="pindex-rows">
                {list.map((e) => {
                  const isActive = e.label === active
                  const cls = `pindex-row${e.review != null ? ' review' : ''}${isActive ? ' active' : ''}`
                  return (
                    <button
                      key={e.label}
                      type="button"
                      className={cls}
                      data-label={e.label}
                      aria-current={isActive ? 'true' : undefined}
                      onClick={() => onSelect(e)}
                    >
                      <span className="pindex-row-top">
                        <strong>{labelText(e.label)}</strong>
                        {e.hasFigure && <span className="pindex-fig">그림</span>}
                      </span>
                      <span className="pindex-answer">
                        <span className="pindex-muted">정답</span>{' '}
                        {e.answer ? <RichText text={e.answer} /> : '-'}
                        {e.review != null && ' (미확정)'}
                      </span>
                      {e.review != null && (
                        <span className="pindex-reason">검토 필요: {e.review}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
