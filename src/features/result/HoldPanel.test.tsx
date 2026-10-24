import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Job, Problem } from '../../shared/api'
import { HoldPanel, decisionText } from './HoldPanel'

const problem = (no: number, extra: Partial<Problem>): Problem => ({
  no, label: String(no), printedNo: null, stem: '발문', choices: [], figures: [], answer: '④', steps: [], verification: null,
  blindAnswer: null, review: null, ...extra,
})

const job = (progress: Job['progress'], problems: Problem[]) => ({ id: '6', progress, problems }) as Job

describe('HoldPanel', () => {
  it('보류 작업의 보류 문항만 사유·AI 답·독립 검증 답·정답표 답과 다섯 선택지로 보인다', () => {
    const html = renderToStaticMarkup(<HoldPanel job={job('hold', [
      problem(20, { hold: '검증 실패, 독립 검증 답 다름', blindAnswer: '<<EQ>>{16} over {81}<</EQ>>', keyAnswer: '①' }),
      problem(21, { hold: null, keyAnswer: '②' }),
    ])} onDecided={() => {}} />)
    expect(html).toContain('20번')
    expect(html).toContain('검증 실패, 독립 검증 답 다름')
    expect(html).toContain('AI 답')
    expect(html).toContain('독립 검증 답')
    expect(html).toContain('정답표 답')
    for (const label of ['AI 답으로 정하기', '정답표 답으로 정하기', '발문·정답 직접 고치기', '해설 고쳐 달라고 하기', '문제 제외하기']) expect(html).toContain(label)
    expect(html).not.toContain('21번')
  })

  it('보류가 아니면 아무것도 그리지 않는다', () => {
    expect(renderToStaticMarkup(<HoldPanel job={job('done', [problem(20, { hold: null })])} onDecided={() => {}} />)).toBe('')
    expect(renderToStaticMarkup(<HoldPanel job={job('haesol', [problem(20, { hold: '검증 실패' })])} onDecided={() => {}} />)).toBe('')
  })

  it('요청을 이미 고친 문항(revised)뿐이면 해설 차례여도 대기 안내와 보류 목록을 그리지 않는다', () => {
    const html = renderToStaticMarkup(<HoldPanel job={job('haesol', [
      problem(20, { hold: null, revised: true, decision: { choice: 'revise', at: '', request: '계산 다시' } }),
    ])} onDecided={() => {}} />)
    expect(html).toBe('')
  })

  it('해설 고쳐 달라는 요청이 남은 작업(해설 차례)도 보류 문항을 보여 결정을 바꿀 수 있고, 대화창이나 묶음 실행으로 고친다고 알린다', () => {
    const html = renderToStaticMarkup(<HoldPanel job={job('haesol', [
      problem(20, { hold: '독립 검증 답 다름', decision: { choice: 'revise', at: '', request: '계산 다시' } }),
    ])} onDecided={() => {}} />)
    expect(html).toContain('20번')
    expect(html).toContain('해설 고쳐 달라고 함: 계산 다시')
    expect(html).toContain('AI 답으로 정하기')
    expect(html).toContain('AI 연결 대화창에서 이어 하거나 묶음 실행을 다시 누르면')
  })
})

describe('decisionText', () => {
  it('결정을 강사 말로 바꾼다', () => {
    expect(decisionText({ choice: 'ai', at: '', answer: '④' })).toBe('AI 답으로 정함')
    expect(decisionText({ choice: 'key', at: '' })).toBe('정답표 답으로 정함')
    expect(decisionText({ choice: 'edit', at: '', stem: true })).toBe('발문·정답 직접 고침')
    expect(decisionText({ choice: 'revise', at: '', request: '계산 다시' })).toBe('해설 고쳐 달라고 함: 계산 다시')
    expect(decisionText({ choice: 'exclude', at: '' })).toBe('문제 제외')
  })
})
