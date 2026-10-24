import { afterEach, expect, it, vi } from 'vitest'
import { watchCurrentPage } from './OriginalPages'

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
