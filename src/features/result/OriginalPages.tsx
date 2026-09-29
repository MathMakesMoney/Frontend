import { useEffect, useState } from 'react'
import { figureUrl, pageImageUrl, type Job } from '../../shared/api'

// @rhwp/core 는 원본 시험지를 처음 펼칠 때만 불러온다 (WASM 이 커서)
let rhwp: Promise<typeof import('@rhwp/core')> | null = null
function loadRhwp() {
  rhwp ??= (async () => {
    const [core, wasm] = await Promise.all([import('@rhwp/core'), import('@rhwp/core/rhwp_bg.wasm?url')])
    // rhwp 가 줄 나누기 계산에 쓰는 글자 폭 측정 (초기화 전에 등록해야 한다)
    const ctx = document.createElement('canvas').getContext('2d')!
    Object.assign(globalThis, {
      measureTextWidth: (font: string, text: string) => {
        ctx.font = font
        return ctx.measureText(text).width
      },
    })
    await core.default({ module_or_path: wasm.default })
    return core
  })()
  return rhwp
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
  return (
    <div className="page-images">
      {urls.map((u, i) => (
        <img key={u} src={u} alt={`원본 ${i + 1}쪽`} />
      ))}
    </div>
  )
}

// 원본 시험지 (접기/펼치기). MCP 가 문항을 풀기 전(업로드·문항 저장)에는 펼쳐 둔다
export function OriginalPages({ job }: { job: Job }) {
  const [userOpen, setUserOpen] = useState<boolean | null>(null)
  const open = userOpen ?? (job.stage === 'uploaded' || job.stage === 'problems')

  return (
    <section className="original-pages">
      <button type="button" className="button-plain" onClick={() => setUserOpen(!open)}>
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
        <div className="page-images">
          {/* 쪽 번호는 1부터 pages 까지 (백엔드가 고른 쪽만 모아 1쪽부터 다시 매김) */}
          {Array.from({ length: job.pages }, (_, i) => (
            <img key={i} src={pageImageUrl(job.id, i + 1)} alt={`원본 ${i + 1}쪽`} />
          ))}
        </div>
      )}
      {open && job.inputType === 'HWPX' && <HwpPages jobId={job.id} path="view.hwpx" />}
      {open && job.inputType === 'HWP' && <HwpPages jobId={job.id} path="source.hwp" />}
    </section>
  )
}
