import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { AcademyItem, Problem } from '../../shared/api'
import { ItemEditor, changedFields, gridRows } from './ItemEditor'
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
})

describe('ItemEditor', () => {
  it('선지는 칸마다, 표는 글 칸만 입력, 그림 칸·가려진 칸은 읽기 전용', () => {
    const html = renderToStaticMarkup(<ItemEditor problem={problem({})} answer="③" answerLabel="정답" cells onSave={async () => {}} />)
    expect(html).toContain('value="② 2"')
    expect(html).toContain('value="&lt;&lt;EQ&gt;&gt;rm C&lt;&lt;/EQ&gt;&gt;"')
    expect(html).toContain('rowSpan="3"'.toLowerCase())
    expect(html).toContain('(그림)')
    expect(html.match(/<input/g)?.length).toBe(2 + 3 + 1)  // 선지 2, 글 칸 3(A·B·C), 정답 1
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
