import { useState } from 'react'
import { pageImageUrl } from '../../shared/api'

// PDF 작업의 원본 쪽 보기 (접기/펼치기)
export function OriginalPages({ jobId, pages }: { jobId: string; pages: number }) {
  const [open, setOpen] = useState(false)
  // 쪽 번호는 1부터 pages 까지 (백엔드가 고른 쪽만 모아 1쪽부터 다시 매김)
  const pageNumbers = Array.from({ length: pages }, (_, i) => i + 1)

  if (pageNumbers.length === 0) return null

  return (
    <section className="original-pages">
      <button type="button" className="button-plain" onClick={() => setOpen(!open)}>
        {open ? '▼' : '▶'} 원본 쪽 보기
      </button>
      {open && (
        <div className="page-images">
          {pageNumbers.map((n) => (
            <img key={n} src={pageImageUrl(jobId, n)} alt={`원본 ${n}쪽`} />
          ))}
        </div>
      )}
    </section>
  )
}
