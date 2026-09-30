import { expect, test } from 'vitest'
import { scrollProgress, demoCopyStep } from './LandingPage'

test('스크롤 진행률은 아래로 갈수록 증가하고 위로 돌아오면 감소한다', () => {
  expect(scrollProgress(300, 2400, 800)).toBe(0)
  expect(scrollProgress(0, 2400, 800)).toBe(0)
  expect(scrollProgress(-800, 2400, 800)).toBe(0.5)
  expect(scrollProgress(-1600, 2400, 800)).toBe(1)
  expect(scrollProgress(-2000, 2400, 800)).toBe(1)
  expect(scrollProgress(-400, 2400, 800)).toBe(0.25)
  expect(scrollProgress(0, 800, 800)).toBe(0)
})

test('설명은 한 단계만 선택하며 역스크롤에서도 이전 단계로 돌아간다', () => {
  expect([0, .32, .34, .65, .67, 1].map(demoCopyStep)).toEqual([0, 0, 1, 1, 2, 2])
  expect([.9, .5, .1].map(demoCopyStep)).toEqual([2, 1, 0])
})
