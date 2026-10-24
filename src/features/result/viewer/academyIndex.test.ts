import { expect, it } from 'vitest'
import type { Problem } from '../../../shared/api'
import { academyIndex, academyPages } from './academyIndex'

// 결과 문서(학원 양식) 쪽마다 번호 칸 글자: 쪽 표(4x2, 긴 문항 두 개면 2x2)의 0·2행, 정답 쪽은 '정답'. 머리말 표는 읽으면 오류
it('rhwp 쪽 배치에서 쪽마다 번호 칸 글자를 읽는다 (칸 속 표·머리말 표는 건너뜀)', () => {
  const table = (para: number, ctrl: number, rows: number, texts: [number, string][], nested = false) => ({
    type: 'table',
    secIdx: 0,
    paraIdx: para,
    controlIdx: ctrl,
    rowCount: rows,
    colCount: 2,
    stableIndex: nested ? [0, para, ctrl, 2, 1, 0, 0, 0, 0] : [0, para, ctrl],
    cells: texts.map(([row], i) => ({ row, cellIdx: i })),
    texts: texts.map(([, t]) => t),
  })
  const header = table(0, 0, 3, [[0, '']])
  const layouts = [
    [header, table(0, 3, 4, [[0, '01'], [0, '03'], [1, '12'], [2, '02'], [2, '']]), table(1, 0, 1, [[0, '99']], true)],
    [header, table(1, 0, 2, [[0, '04'], [0, '05'], [1, '내용']])],
    [header, table(2, 0, 2, [[0, '정답'], [0, '']])],
    [header],
  ]
  const doc = {
    pageCount: () => layouts.length,
    getPageControlLayout: (p: number) => JSON.stringify({ controls: [...layouts[p], { type: 'picture' }] }),
    // 머리말 표는 본문 문단이 아니라 읽으면 오류 (rhwp: 셀 문단 접근 실패)
    getTextInCell: (_s: number, para: number, ctrl: number, cell: number) => {
      const t = layouts.flat().find((x) => x !== header && x.paraIdx === para && x.controlIdx === ctrl && x.stableIndex.length === 3)
      if (!t) throw new Error('셀 문단 접근 실패')
      return t.texts[cell]
    },
  }
  expect(academyPages(doc)).toEqual([
    { numbers: ['01', '03', '02'], answer: false },
    { numbers: ['04', '05'], answer: false },
    { numbers: [], answer: true },
    { numbers: [], answer: false },
  ])
})

const prob = (no: number, extra: Partial<Problem> = {}) =>
  ({ no, printedNo: no, label: String(no), stem: '', choices: [], figures: [], answer: null, review: null, ...extra }) as unknown as Problem

// 번호 NN 은 문항 순서 NN 번째 (items.json 은 문항과 같은 순서, 제외한 문항도 칸에 남는다). 정답은 풀이 답, 없으면 정답표 답
it('쪽별 번호를 문항 목록과 쪽 메모(정답, 붙인 문서)로 바꾼다', () => {
  const problems = [
    prob(1, { answer: '②' }),
    prob(2, { label: '서술형 1', item: { answer: '3' } as Problem['item'] }),
    prob(3, { answer: '①', review: '검증 실패', figures: ['f.png'] }),
    prob(4),
  ]
  const pages = [
    { numbers: ['01', '03', '02'], answer: false },
    { numbers: ['04'], answer: false },
    { numbers: [], answer: true },
    { numbers: [], answer: false },
    { numbers: [], answer: false },
  ]
  expect(academyIndex(pages, problems, ['typing', 'haesol'])).toEqual({
    entries: [
      { label: '1', page: 0, answer: '②', review: null, hasFigure: false },
      { label: '서술형 1', page: 0, answer: '3', review: null, hasFigure: false },
      { label: '3', page: 0, answer: '①', review: '검증 실패', hasFigure: true },
      { label: '4', page: 1, answer: null, review: null, hasFigure: false },
    ],
    notes: [undefined, undefined, '정답', '해설', '해설'],
  })
  expect(academyIndex(pages, problems, ['typing', 'variant']).notes.slice(3)).toEqual(['변형', '변형'])
  expect(academyIndex(pages, problems, ['typing', 'haesol', 'variant']).notes.slice(3)).toEqual(['해설·변형', '해설·변형'])
})
