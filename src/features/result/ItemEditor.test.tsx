import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { AcademyItem, Problem } from '../../shared/api'
import { ItemEditor, changedFields, circledAnswer, gridRows } from './ItemEditor'
import { ProblemCard } from './ProblemCard'

const item: AcademyItem = {
  answer: '③',
  parts: [
    { kind: 'L', text: '그림의 네 영역을 칠하는 방법의 수는?', box: [] },
    { kind: 'T', text: '3 2 0,0,3,1', box: ['<<EQ>>rm A<</EQ>>', '<<EQ>>rm B<</EQ>>', '', '<<EQ>>rm C<</EQ>>', '', '[그림:4 100 100]'] },
  ],
  choices: ['① 1', '② 2'],
}

const problem = (extra: Partial<Problem>): Problem => ({
  no: 3, label: '3', printedNo: null, stem: '발문', choices: ['① 1', '② 2'], figures: [], answer: null, steps: [], verification: null,
  blindAnswer: null, review: null, item, ...extra,
})

describe('gridRows', () => {
  it('합친 칸은 rowSpan·colSpan 으로, 가려진 칸은 빼고, 그림 칸을 표시한다', () => {
    const rows = gridRows(item.parts[1])
    expect(rows.map(r => r.map(c => c.index))).toEqual([[0, 1], [3], [5]])
    expect(rows[0][0]).toMatchObject({ rowSpan: 3, colSpan: 1, picture: false })
    expect(rows[2][0].picture).toBe(true)
  })
})

describe('changedFields', () => {
  const draft = { stem: '발문', choices: ['① 1', '② 2'], cells: {} as Record<string, string>, answer: '③' }
  it('바뀐 것만 보낸다 (선지는 하나라도 바뀌면 전체, 칸은 바뀐 칸만)', () => {
    expect(changedFields(problem({}), '③', draft)).toEqual({})
    expect(changedFields(problem({}), '③', { ...draft, stem: '고친 발문', answer: ' ④ ' })).toEqual({ stem: '고친 발문', answer: '④' })
    expect(changedFields(problem({}), '③', { ...draft, choices: ['① 1', '② 5'] })).toEqual({ choices: ['① 1', '② 5'] })
    expect(changedFields(problem({}), '③', { ...draft, cells: { '1:1': '<<EQ>>rm B<</EQ>>', '1:3': '<<EQ>>rm E<</EQ>>' } }))
      .toEqual({ cells: [{ part: 1, index: 3, text: '<<EQ>>rm E<</EQ>>' }] })
  })

  it('객관식 정답은 동그라미로 바꿔 비교한다 (바꾼 값이 원래와 같으면 안 고친 것)', () => {
    expect(changedFields(problem({}), '③', { ...draft, answer: '3' })).toEqual({})
    expect(changedFields(problem({}), '③', { ...draft, answer: '2,4' })).toEqual({ answer: '②, ④' })
    expect(changedFields(problem({}), '3', { ...draft, answer: '3' })).toEqual({})
    const essay = problem({ item: { ...item, choices: [] } })
    expect(changedFields(essay, '3', { ...draft, choices: [], answer: '5' })).toEqual({ answer: '5' })
  })
})

describe('circledAnswer', () => {
  it('선지가 있으면 숫자를 동그라미 숫자로, 여러 답은 ", " 로 잇는다', () => {
    expect(circledAnswer('3', true)).toBe('③')
    expect(circledAnswer(' 3 ', true)).toBe('③')
    expect(circledAnswer('2, 4', true)).toBe('②, ④')
    expect(circledAnswer('2,4', true)).toBe('②, ④')
    expect(circledAnswer('② 4', true)).toBe('②, ④')
    expect(circledAnswer('10', true)).toBe('⑩')
  })

  it('서술형, 이미 동그라미, 숫자만이 아닌 답은 그대로', () => {
    expect(circledAnswer('3', false)).toBe('3')
    expect(circledAnswer('③', true)).toBe('③')
    expect(circledAnswer('③,④', true)).toBe('③,④')
    for (const s of ['3번', '11', '0', '<<EQ>>3<</EQ>>', '', '①②']) expect(circledAnswer(s, true)).toBe(s)
  })
})

describe('ItemEditor', () => {
  it('선지는 줄마다, 표는 글 칸만 고치고, 그림 칸·가려진 칸은 읽기 전용. 수식은 칩, 원문 보기 토글', () => {
    const html = renderToStaticMarkup(<ItemEditor problem={problem({})} answer="③" answerLabel="정답" cells onSave={async () => {}} />)
    expect(html).toContain('② 2')
    expect(html).toContain('aria-label="수식 rm C"')
    expect(html).not.toContain('&lt;&lt;EQ')
    expect(html).toContain('rowSpan="3"'.toLowerCase())
    expect(html).toContain('(그림)')
    expect(html.match(/role="group"/g)?.length).toBe(1 + 2 + 3)  // 발문 1, 선지 2, 글 칸 3(A·B·C)
    expect(html.match(/<input/g)?.length).toBe(1)  // 정답만 입력칸
    expect(html).toContain('원문으로 보기')
  })

  it('AI 로 뽑은 문항(cells 없음)은 표를 발문의 표 줄에서 고친다', () => {
    const html = renderToStaticMarkup(<ItemEditor problem={problem({})} answer="③" answerLabel="정답" cells={false} onSave={async () => {}} />)
    expect(html).not.toContain('<table')
    expect(html).toContain('표는 발문의 표 줄에서')
  })
})

describe('ProblemCard', () => {
  it('문항 데이터가 있으면 고치기 버튼을 보인다', () => {
    expect(renderToStaticMarkup(<ProblemCard jobId="1" jobTitle="t" problem={problem({})} cellsEditable onSaved={() => {}} />)).toContain('문항 고치기')
    expect(renderToStaticMarkup(<ProblemCard jobId="1" jobTitle="t" problem={problem({ item: undefined })} />)).not.toContain('문항 고치기')
  })
})
