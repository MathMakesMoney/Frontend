import { useEffect, useRef, useState } from 'react'
import { figureUrl, pageImageUrl, type Job } from '../../shared/api'
import './OriginalPages.css'
import { loadRhwp } from '../../shared/hangulRenderer'

// 쪽 이미지 + 오른쪽 쪽 이동판 (PDF, 한글 공통)
function PageImages({ urls }: { urls: string[] }) {
  const box = useRef<HTMLDivElement>(null)
  const [cur, setCur] = useState(0)

  // 화면 위에서 30% 지점을 지난 마지막 쪽을 현재 쪽으로 본다
  useEffect(() => {
    const onScroll = () => {
      const imgs = box.current?.children
      if (!imgs) return
      const line = window.innerHeight * 0.3
      let now = 0
      for (let i = 0; i < imgs.length; i++) if (imgs[i].getBoundingClientRect().top <= line) now = i
      setCur(now)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
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
          <img key={u} src={u} alt={`원본 ${i + 1}쪽`} />
        ))}
      </div>
      <nav className="page-nav" aria-label="원본 시험지 쪽 이동">
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

// 한글 원본을 쪽마다 SVG 로 그려 이미지로 보인다 (쪽끼리 SVG id 가 겹치지 않게 img 로 띄운다)
function HwpPages({ jobId, path }: { jobId: string; path: string }) {
  const [urls, setUrls] = useState<string[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    let made: string[] = []
    Promise.all([loadRhwp(), fetch(figureUrl(jobId, path)).then((res) => res.arrayBuffer())])
      .then(([core, buf]) => {
        const doc = new core.HwpDocument(new Uint8Array(buf))
        // 글상자 안쪽 영역 자르기는 뺀다: 한글은 글상자 안 개체(<보기> 테두리 상자)가 안쪽 여백을 넘어도 그대로 그린다 (경안고)
        made = Array.from({ length: doc.pageCount() }, (_, i) =>
          URL.createObjectURL(
            new Blob([doc.renderPageSvg(i).replace(/ clip-path="url\(#textbox-clip-\d+\)"/g, '')], { type: 'image/svg+xml' }),
          ),
        )
        doc.free()
        if (alive) setUrls(made)
        else made.forEach((u) => URL.revokeObjectURL(u))
      })
      .catch(() => alive && setError('원본 시험지를 그리지 못했습니다'))
    return () => {
      alive = false
      made.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [jobId, path])

  if (error) return <p className="error">{error}</p>
  if (!urls) return <p className="job-meta">원본 시험지를 그리는 중...</p>
  return <PageImages urls={urls} />
}

// 원본 시험지 (접기/펼치기). 기본은 접어 둔다 (쪽이 많으면 화면이 길어지고 그리는 데 오래 걸려서, 2026-09-29 요청)
export function OriginalPages({ job }: { job: Job }) {
  const [open, setOpen] = useState(false)

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
        <PageImages urls={Array.from({ length: job.pages }, (_, i) => pageImageUrl(job.id, i + 1))} />
      )}
      {open && job.inputType === 'HWPX' && <HwpPages jobId={job.id} path="view.hwpx" />}
      {open && job.inputType === 'HWP' && <HwpPages jobId={job.id} path="source.hwp" />}
    </section>
  )
}
