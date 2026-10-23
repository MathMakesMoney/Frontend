import { useState } from 'react'
import { academyUrl, type Job } from '../../shared/api'
import { HwpPages } from './OriginalPages'

// 학원 양식 보기: 내려받는 academy.hwp 를 사이트에서 쪽마다 그린다 (접어 둠, 처음 펼칠 때만 WASM 과 파일을 불러온다)
// version 이 바뀌면(결과 문서가 다시 만들어짐) 새로 받아 그린다
export function AcademyPreview({ job, version }: { job: Job; version: number }) {
  const [open, setOpen] = useState(false)
  if (!job.files.academyHwp) return null

  return (
    <section className="original-pages">
      <button type="button" className="button-plain" onClick={() => setOpen(!open)}>
        {open ? '▼' : '▶'} 학원 양식 보기
      </button>
      <p className="job-meta">사이트 미리보기는 한글과 줄 넘김·수식 크기가 조금 다를 수 있어요. 최종 확인은 한글에서</p>
      {open && <HwpPages key={version} name="학원 양식" url={academyUrl(job.id, 'hwp')} />}
    </section>
  )
}
