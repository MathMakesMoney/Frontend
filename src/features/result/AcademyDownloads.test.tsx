import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AcademyDownloads } from './AcademyDownloads'

it('결과 문서 파일이 있는 작업에만 내려받기 링크를 보인다', () => {
  const both = renderToStaticMarkup(<AcademyDownloads jobId="7" files={{ hwp: false, hwpx: false, academyHwp: true, academyHwpx: true }} />)
  expect(both).toContain('href="/api/jobs/7/academy.hwp">결과 문서 HWP<')
  expect(both).toContain('href="/api/jobs/7/academy.hwpx">결과 문서 HWPX<')
  const hwpOnly = renderToStaticMarkup(<AcademyDownloads jobId="7" files={{ hwp: false, hwpx: false, academyHwp: true, academyHwpx: false }} />)
  expect(hwpOnly).not.toContain('HWPX')
  expect(renderToStaticMarkup(<AcademyDownloads jobId="7" files={{ hwp: true, hwpx: true }} />)).toBe('')
})
