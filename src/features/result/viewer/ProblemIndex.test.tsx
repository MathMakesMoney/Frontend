import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProblemIndex } from './ProblemIndex'

const props = { entries: [], pageCount: 1, current: 0, active: null, onSelect: () => {} }

it('목록 읽기가 실패하면 번호 없음과 다른 문구를 보인다', () => {
  expect(renderToStaticMarkup(<ProblemIndex {...props} />)).toContain('번호 붙은 문제 쪽이 없어요')
  const failed = renderToStaticMarkup(<ProblemIndex {...props} readFailed />)
  expect(failed).toContain('문항 목록을 읽지 못했어요')
  expect(failed).not.toContain('번호 붙은 문제 쪽이 없어요')
})
