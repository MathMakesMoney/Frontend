import { useRef, useState } from 'react'
import type { Problem } from '../../shared/api'
import { shortLabel, labelText } from '../../shared/labelText'
import { ProblemCard } from './ProblemCard'

// 문항별 결과: 오른쪽 번호판에서 고른 문항 한 개만 보인다 (전체 보기를 누르면 모두). 검토 필요 번호는 경고 색, 처음엔 첫 검토 필요 문항
export function ProblemBrowser({ jobId, problems }: { jobId: string; problems: Problem[] }) {
  const [picked, setPicked] = useState<number | null>(null)
  const [all, setAll] = useState(false)
  const top = useRef<HTMLElement>(null)
  const current =
    problems.find((p) => p.no === picked) ?? problems.find((p) => p.review !== null) ?? problems[0]
  const reviewCount = problems.filter((p) => p.review !== null).length

  function pick(no: number | null) {
    setAll(no === null)
    if (no !== null) setPicked(no)
    // 긴 문항을 내려 보다 고르면 새 문항 맨 위부터 보이게
    if (top.current && top.current.getBoundingClientRect().top < 0) top.current.scrollIntoView()
  }

  return (
    <section className="problems" ref={top}>
      <h2>
        문항별 결과
        {reviewCount > 0 && <span className="review-count-inline"> · 검토 필요 {reviewCount}</span>}
      </h2>
      <div className="problem-browser">
        <div>
          {all ? (
            problems.map((p) => <ProblemCard key={p.no} jobId={jobId} problem={p} />)
          ) : (
            <ProblemCard key={current.no} jobId={jobId} problem={current} />
          )}
        </div>
        <nav className="problem-nav" aria-label="문항 번호">
          <button
            type="button"
            className={`problem-nav-item problem-nav-all${all ? ' active' : ''}`}
            aria-current={all}
            onClick={() => pick(null)}
          >
            전체 보기
          </button>
          {problems.map((p) => (
            <button
              key={p.no}
              type="button"
              className={`problem-nav-item${p.review !== null ? ' needs-review' : ''}${!all && p.no === current.no ? ' active' : ''}`}
              aria-current={!all && p.no === current.no}
              aria-label={labelText(p.label ?? p.no)}
              title={p.review !== null ? `${labelText(p.label ?? p.no)} 검토 필요: ${p.review}` : labelText(p.label ?? p.no)}
              onClick={() => pick(p.no)}
            >
              {shortLabel(p.label ?? p.no)}
            </button>
          ))}
        </nav>
      </div>
    </section>
  )
}
