import { afterEach, expect, it, vi } from 'vitest'
import { reflowNestedCells, unstretchEquations, watchCurrentPage } from './OriginalPages'

afterEach(() => vi.unstubAllGlobals())

// 결과물 보기 결과 문서 탭에서 잰 값 (창 높이 828, 기준선 248): 불러오기 전엔 쪽 이미지 높이가 테두리 2px 뿐이라 쪽이 겹쳐 있다
it('쪽 이미지가 불러와져 크기가 바뀌면 지금 쪽을 다시 잰다 (1쪽을 보는데 뒤 쪽 번호가 나오지 않게)', () => {
  let tops = [176, 186, 196]
  let resized = () => {}
  vi.stubGlobal('window', { innerHeight: 828, addEventListener() {}, removeEventListener() {} })
  vi.stubGlobal('ResizeObserver', class {
    constructor(cb: () => void) {
      resized = cb
    }
    observe() {}
    disconnect() {}
  })
  const box = { children: tops.map((_, i) => ({ getBoundingClientRect: () => ({ top: tops[i] }) })) } as unknown as HTMLElement
  const seen: number[] = []

  watchCurrentPage(box, (page) => seen.push(page))
  // 다 불러온 뒤: 1쪽이 화면 위에 있고 2쪽은 기준선 아래
  tops = [176, 2163, 4150]
  resized()

  expect(seen[seen.length - 1]).toBe(0)
})

// 결과 문서 미리보기: rhwp reflowLinesegs 는 칸 한 겹만 다시 계산해 칸 속 상자(<보기>)의 줄이 상자 끝에서 잘렸다 (../Backend 오류 기록 050)
it('줄 배치가 없는 칸 문단만 글자 하나를 넣었다 지워 다시 계산하게 한다', () => {
  // 목록 1: [줄 없음 글 5, 빈 문단, 이미 계산됨], 목록 2: [줄 없음 글 3], 그 뒤는 없음
  const paras: Record<number, { end: number; lines: string }[]> = {
    1: [{ end: 5, lines: '[]' }, { end: 0, lines: '[]' }, { end: 3, lines: '[0]' }],
    2: [{ end: 3, lines: '[]' }],
  }
  const calls: string[] = []
  const doc = {
    getParaBounds: (l: number, p: number) => (paras[l]?.[p] ? JSON.stringify({ start: 0, end: paras[l][p].end }) : '{}'),
    getLineStarts: (l: number, p: number) => paras[l][p].lines,
    insertTextAtCursor: (l: number, p: number, pos: number, text: string) => (calls.push(`ins ${l}.${p}@${pos}${text}`), ''),
    deleteAtCursor: (l: number, p: number, from: number, to: number) => (calls.push(`del ${l}.${p} ${from}-${to}`), ''),
  }
  expect(reflowNestedCells(doc)).toBe(2)
  expect(calls).toEqual(['ins 1.0@0 ', 'del 1.0 0-1', 'ins 2.0@0 ', 'del 2.0 0-1'])
})

// 수식 상자 폭이 실제보다 1.5배 넘게 넓으면(어림 폭이 크게 틀린 수식, 예: P ne EMPTYSET) 가로로 늘리지 않고 제 크기로 그린다
it('수식 묶음의 가로 늘림이 1.5 를 넘으면 1 로 되돌린다', () => {
  const svg =
    '<g transform="translate(1,2) scale(4.1507,1.0000)"><text>P</text></g>' +
    '<g transform="translate(3,4) scale(1.2422,1.0000)"><text>f</text></g>' +
    '<text transform="translate(5,6) scale(0.9747,1)">0</text>'
  expect(unstretchEquations(svg)).toBe(
    '<g transform="translate(1,2) scale(1,1.0000)"><text>P</text></g>' +
      '<g transform="translate(3,4) scale(1.2422,1.0000)"><text>f</text></g>' +
      '<text transform="translate(5,6) scale(0.9747,1)">0</text>',
  )
})
