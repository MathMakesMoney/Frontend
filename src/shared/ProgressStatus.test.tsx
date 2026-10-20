import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProgressStatus } from './ProgressStatus'

it('진행을 강사 말로 보이고 실패면 사유를 붙인다', () => {
  expect(renderToStaticMarkup(<ProgressStatus job={{ progress: 'hold' }} />)).toContain('보류 · 검토 필요')
  expect(renderToStaticMarkup(<ProgressStatus job={{ progress: 'done' }} />)).toContain('job-status done')
  const failed = renderToStaticMarkup(<ProgressStatus job={{ progress: 'failed', progressError: '수식 수가 다르다' }} />)
  expect(failed).toContain('실패')
  expect(failed).toContain('수식 수가 다르다')
  expect(renderToStaticMarkup(<ProgressStatus job={{}} />)).toBe('')
})
