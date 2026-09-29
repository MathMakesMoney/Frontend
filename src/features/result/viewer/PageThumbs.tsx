import { useEffect, useRef } from 'react'
import { HaesolPage } from '../haesolPages'
import type { PageThumbsProps } from './types'
import './PageThumbs.css'

// 왼쪽: 쪽 썸네일 목록. 카드를 누르면 그 쪽으로 (보기 전용)
export function PageThumbs({ jobId, header, layout, current, entries, onSelect }: PageThumbsProps) {
  const currentRef = useRef<HTMLButtonElement>(null)

  // 다른 칸에서 쪽이 바뀌어도 고른 카드가 보이게
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'nearest' })
  }, [current])

  return (
    <aside className="viewer-panel page-thumbs">
      <div className="page-thumbs-head">
        <strong>쪽 목록</strong>
        <span className="page-thumbs-count">{layout.pages.length}쪽</span>
      </div>
      {layout.pages.map((_, i) => {
        const count = entries.filter((e) => e.page === i).length
        const isCurrent = i === current
        return (
          <button
            key={i}
            type="button"
            ref={isCurrent ? currentRef : undefined}
            className={`page-thumb${isCurrent ? ' current' : ''}`}
            aria-current={isCurrent ? 'page' : undefined}
            aria-label={`${i + 1}쪽, ${count}문항`}
            onClick={() => onSelect(i)}
          >
            <span className="page-thumb-clip">
              <span className="page-thumb-inner">
                <HaesolPage jobId={jobId} header={header} layout={layout} index={i} />
              </span>
            </span>
            <span className="page-thumb-meta">
              <span className="page-thumb-no">{i + 1}</span>
              <span className="page-thumb-badge">{count}문항</span>
            </span>
          </button>
        )
      })}
    </aside>
  )
}
