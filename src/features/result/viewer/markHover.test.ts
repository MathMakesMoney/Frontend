import { expect, it } from 'vitest'
import { markHover } from './markHover'

// DOM 없이 data-label 과 classList 만 흉내 낸 요소
const el = (label: string) => {
  const classes = new Set<string>()
  return { dataset: { label }, classes, classList: { toggle: (c: string, on: boolean) => void (on ? classes.add(c) : classes.delete(c)) } }
}

it('hovered label 의 data-label 요소에만 클래스를 붙이고, 바뀌면 이전 것에서 뗀다', () => {
  const els = [el('1'), el('2'), el('2'), el('3')]
  const root = { querySelectorAll: () => els }
  const on = () => els.map((e) => e.classes.has('academy-hover'))

  markHover(root, '2')
  expect(on()).toEqual([false, true, true, false])
  markHover(root, '3')
  expect(on()).toEqual([false, false, false, true])
  markHover(root, null)
  expect(on()).toEqual([false, false, false, false])
})
