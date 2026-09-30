import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { figureUrl, type InputType } from './api'
import { loadRhwp } from './hangulRenderer'

// 화면 가까이에 온 한글 시험지만 첫 쪽을 그리고, 목록을 다시 열면 캐시를 쓴다
export function HangulCover({ jobId, inputType, title, className, children }: {
  jobId: string
  inputType: Extract<InputType, 'HWP' | 'HWPX'>
  title: string
  className?: string
  children: ReactNode
}) {
  const box = useRef<HTMLSpanElement>(null)
  const [visible, setVisible] = useState(false)
  const [url, setUrl] = useState('')
  const path = inputType === 'HWP' ? 'source.hwp' : 'view.hwpx'
  const { data: svg } = useQuery({
    queryKey: ['hangul-cover', jobId, path],
    enabled: visible,
    staleTime: Infinity,
    retry: false,
    queryFn: async ({ signal }) => {
      const [core, response] = await Promise.all([loadRhwp(), fetch(figureUrl(jobId, path), { signal })])
      if (!response.ok) throw new Error('시험지 표지를 불러오지 못했습니다')
      const doc = new core.HwpDocument(new Uint8Array(await response.arrayBuffer()))
      try {
        return doc.renderPageSvg(0).replace(/ clip-path="url\(#textbox-clip-\d+\)"/g, '')
      } finally {
        doc.free()
      }
    },
  })

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true)
        observer.disconnect()
      }
    }, { rootMargin: '200px' })
    if (box.current) observer.observe(box.current.parentElement ?? box.current)
    return () => observer.disconnect()
  }, [])

  // SVG 캐시와 화면용 주소를 분리해 카드가 사라지면 브라우저 메모리를 반환한다
  useEffect(() => {
    if (!svg) return
    const nextUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    setUrl(nextUrl)
    return () => URL.revokeObjectURL(nextUrl)
  }, [svg])

  return <span ref={box} style={{ display: 'contents' }}>
    {url ? <img className={className} src={url} alt={`${title} 시험지 첫 쪽`} onError={() => setUrl('')} /> : children}
  </span>
}
