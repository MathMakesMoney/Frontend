import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProgressStatus } from './ProgressStatus'

it('진행을 강사 말로 보이고 실패면 사유를 붙인다', () => {
  expect(renderToStaticMarkup(<ProgressStatus job={{ progress: 'hold' }} />)).toContain('보류 · 검토 필요')
  expect(renderToStaticMarkup(<ProgressStatus job={{ progress: 'extract' }} />)).toContain('job-status working">문항 뽑기 차례')
  expect(renderToStaticMarkup(<ProgressStatus job={{ progress: 'done' }} />)).toContain('job-status done')
  const failed = renderToStaticMarkup(<ProgressStatus job={{ progress: 'failed', progressError: '수식 수가 다르다' }} />)
  expect(failed).toContain('실패')
  expect(failed).toContain('수식 수가 다르다')
  expect(renderToStaticMarkup(<ProgressStatus job={{}} />)).toBe('')
})

it('변형 차례와 변형까지 끝난 작업을 구분한다', () => {
  const waiting = renderToStaticMarkup(<ProgressStatus job={{ progress: 'variant', features: ['haesol', 'variant'] }} />)
  expect(waiting).toContain('변형 차례')
  const done = renderToStaticMarkup(<ProgressStatus job={{ progress: 'done', features: ['haesol', 'variant'] }} />)
  expect(done).toContain('변형 완료')
  expect(renderToStaticMarkup(<ProgressStatus job={{ progress: 'done', features: ['haesol'] }} />)).not.toContain('변형 완료')
})

it('변형 실패는 변형 차례를 유지하며 사유를 보인다', () => {
  const html = renderToStaticMarkup(<ProgressStatus job={{ progress: 'variant', variantError: '월 지출 상한에 도달했어요' }} />)
  expect(html).toContain('변형 차례')
  expect(html).toContain('월 지출 상한에 도달했어요')
  expect(html).not.toContain('job-status failed')
})
