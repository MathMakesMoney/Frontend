import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AcademyPreview } from './AcademyPreview'
import type { Job } from '../../shared/api'

const job = (files: Job['files']) => ({ id: '7', files }) as Job

it('결과 문서(academy.hwp)가 있는 작업에만 접힌 학원 양식 보기와 안내를 보인다', () => {
  const html = renderToStaticMarkup(<AcademyPreview job={job({ hwp: false, hwpx: false, academyHwp: true })} version={1} />)
  expect(html).toContain('학원 양식 보기')
  expect(html).toContain('최종 확인은 한글에서')
  // 접혀 있으면 파일도 렌더러도 부르지 않는다
  expect(html).not.toContain('그리는 중')
  expect(renderToStaticMarkup(<AcademyPreview job={job({ hwp: true, hwpx: true })} version={1} />)).toBe('')
  expect(renderToStaticMarkup(<AcademyPreview job={job({ hwp: false, hwpx: false, academyHwp: false, academyHwpx: true })} version={1} />)).toBe('')
})
