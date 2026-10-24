import { expect, it } from 'vitest'
import type { Problem } from '../../../shared/api'
import { academyIndex, academyPages, problemBox, type AcademyPage } from './academyIndex'

// 결과 문서(학원 양식) 쪽마다 번호 칸 글자: 쪽 표(4x2, 긴 문항 두 개면 2x2)의 0·2행, 정답 쪽은 '정답'. 머리말 표는 읽으면 오류
it('rhwp 쪽 배치에서 쪽마다 번호 칸 글자를 읽는다 (칸 속 표·머리말 표는 건너뜀)', () => {
  const table = (para: number, ctrl: number, rows: number, texts: [number, string, number?][], nested = false) => ({
    type: 'table',
    secIdx: 0,
    paraIdx: para,
    controlIdx: ctrl,
    rowCount: rows,
    colCount: 2,
    stableIndex: nested ? [0, para, ctrl, 2, 1, 0, 0, 0, 0] : [0, para, ctrl],
    cells: texts.map(([row, , col = 0], i) => ({ row, col, cellIdx: i, rowSpan: 1, x: col * 100, y: row * 10, w: 100, h: 10 })),
    texts: texts.map(([, t]) => t),
  })
  const header = table(0, 0, 3, [[0, '']])
  const layouts = [
    [header, table(0, 3, 4, [[0, '01'], [0, '03', 1], [1, '12'], [2, '02'], [2, '', 1]]), table(1, 0, 1, [[0, '99']], true)],
    [header, table(1, 0, 2, [[0, '04'], [0, '05', 1], [1, '내용']])],
    [header, table(2, 0, 2, [[0, '정답'], [0, '', 1]])],
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
    // 번호 칸 + 같은 열 아래 문제 칸 (문제 칸이 없으면 번호 칸만)
    { numbers: ['01', '03', '02'], answer: false, boxes: { '01': { x: 0, y: 0, w: 100, h: 20 }, '03': { x: 100, y: 0, w: 100, h: 10 }, '02': { x: 0, y: 20, w: 100, h: 10 } } },
    { numbers: ['04', '05'], answer: false, boxes: { '04': { x: 0, y: 0, w: 100, h: 20 }, '05': { x: 100, y: 0, w: 100, h: 10 } } },
    { numbers: [], answer: true, boxes: {} },
    { numbers: [], answer: false, boxes: {} },
  ])
})

// 실제 쪽 표(작업 9 의 2쪽): 오른쪽 열은 긴 문항이라 문제 칸이 3행을 차지한다
it('문항 사각형은 번호 칸과 같은 열 바로 아래 문제 칸을 합친다 (쪽 그림 좌표)', () => {
  const cell = (row: number, col: number, rowSpan: number, x: number, y: number, w: number, h: number) => ({ row, col, rowSpan, colSpan: 1, cellIdx: 0, x, y, w, h })
  const cells = [
    cell(0, 0, 1, 51, 133.6, 345.8, 46.4),
    cell(0, 1, 1, 396.9, 133.6, 345.8, 46.4),
    cell(1, 0, 1, 51, 179.9, 345.8, 416.1),
    cell(1, 1, 3, 396.9, 179.9, 345.8, 878.7),
    cell(2, 0, 1, 51, 596.1, 345.8, 46.4),
    cell(3, 0, 1, 51, 642.4, 345.8, 416.1),
  ]
  expect(problemBox(cells, cells[0])).toEqual({ x: 51, y: 133.6, w: 345.8, h: 462.4 })
  expect(problemBox(cells, cells[1])).toEqual({ x: 396.9, y: 133.6, w: 345.8, h: 925 })
  expect(problemBox(cells, cells[4])).toEqual({ x: 51, y: 596.1, w: 345.8, h: 462.4 })
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
  const box = { x: 1, y: 2, w: 3, h: 4 }
  const pages: AcademyPage[] = [
    { numbers: ['01', '03', '02'], answer: false, boxes: { '01': box } },
    { numbers: ['04'], answer: false, boxes: {} },
    { numbers: [], answer: true, boxes: {} },
    { numbers: [], answer: false, boxes: {} },
    { numbers: [], answer: false, boxes: {} },
  ]
  expect(academyIndex(pages, problems, ['typing', 'haesol'])).toEqual({
    entries: [
      { label: '1', page: 0, answer: '②', review: null, hasFigure: false, box },
      { label: '서술형 1', page: 0, answer: '3', review: null, hasFigure: false },
      { label: '3', page: 0, answer: '①', review: '검증 실패', hasFigure: true },
      { label: '4', page: 1, answer: null, review: null, hasFigure: false },
    ],
    notes: [undefined, undefined, '정답', '해설', '해설'],
  })
  expect(academyIndex(pages, problems, ['typing', 'variant']).notes.slice(3)).toEqual(['변형', '변형'])
  expect(academyIndex(pages, problems, ['typing', 'haesol', 'variant']).notes.slice(3)).toEqual(['해설·변형', '해설·변형'])
})

// 문항 카드가 없는 작업(문항 목록이 빈 값)은 번호 칸 번호를 그대로 표시 번호로
it('문항 정보가 없으면 번호 칸 번호를 표시 번호로 쓴다', () => {
  const pages = [{ numbers: ['02', '01'], answer: false, boxes: {} }, { numbers: [], answer: true, boxes: {} }]
  expect(academyIndex(pages, [], ['typing']).entries).toEqual([
    { label: '1', page: 0, answer: null, review: null, hasFigure: false },
    { label: '2', page: 0, answer: null, review: null, hasFigure: false },
  ])
})

// 정답 쪽 뒤에 붙은 해설지·변형 문서의 표 칸 숫자는 문항 번호가 아니다
it('정답 쪽 뒤 쪽의 번호는 문항으로 잇지 않는다', () => {
  const pages = [
    { numbers: ['01'], answer: false, boxes: {} },
    { numbers: [], answer: true, boxes: {} },
    { numbers: ['02', '10'], answer: false, boxes: {} },
  ]
  expect(academyIndex(pages, [prob(1), prob(2)], ['typing', 'haesol']).entries.map((e) => `${e.page}:${e.label}`)).toEqual(['0:1'])
})
