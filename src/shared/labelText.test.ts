import { describe, expect, it } from 'vitest'
import { labelText, shortLabel } from './labelText'

describe('labelText', () => {
  it('숫자 번호는 번을 붙이고 서술형은 그대로', () => {
    expect(labelText('20-1')).toBe('20-1번')
    expect(labelText(3)).toBe('3번')
    expect(labelText('서술형 1')).toBe('서술형 1')
  })
  it('번호판 짧은 표기', () => {
    expect(shortLabel('서술형 1-2')).toBe('서1-2')
    expect(shortLabel('5')).toBe('5')
  })
})
