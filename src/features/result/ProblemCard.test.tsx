import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Problem } from '../../shared/api'
import { ProblemCard } from './ProblemCard'

// 타이핑만 고른 hml 작업의 합성 문항 카드 (풀이 칸은 빈 값, 문항 데이터 정답만 있다)
const synthetic: Problem = {
  no: 1, label: '1', printedNo: null, stem: '발문', choices: [], figures: [], answer: null, steps: [], verification: null,
  blindAnswer: null, review: null, item: { answer: '③', parts: [], choices: [] },
}

describe('ProblemCard 타이핑만', () => {
  it('정답표 답을 정답으로 보이고 독립 검증 답은 숨긴다', () => {
    const html = renderToStaticMarkup(<ProblemCard jobId="6" jobTitle="t" problem={synthetic} typingOnly />)
    expect(html).toContain('③')
    expect(html).not.toContain('(없음)')
    expect(html).not.toContain('독립 검증 답')
    expect(html).not.toContain('해설 고쳐 달라고')
  })

  it('해설을 고른 작업은 그대로 (없음) 과 독립 검증 답 칸을 보인다', () => {
    const html = renderToStaticMarkup(<ProblemCard jobId="6" jobTitle="t" problem={synthetic} />)
    expect(html).toContain('(없음)')
    expect(html).toContain('독립 검증 답')
  })

  it('풀이가 없는 문항(풀이 누락)은 해설 고쳐 달라는 링크를 숨기고, 풀이가 있으면 보인다', () => {
    const unsolved = renderToStaticMarkup(<ProblemCard jobId="3" jobTitle="t" problem={synthetic} />)
    expect(unsolved).not.toContain('해설 고쳐 달라고')
    const solved = renderToStaticMarkup(<ProblemCard jobId="3" jobTitle="t" problem={{ ...synthetic, answer: '②', steps: ['풀이'] }} />)
    expect(solved).toContain('해설 고쳐 달라고')
  })
})
