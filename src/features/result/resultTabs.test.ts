import { expect, it } from 'vitest'
import { resultTabs } from './resultTabs'
import type { Job } from '../../shared/api'

const job = (o: Partial<Job>) => ({ inputType: 'HML', files: { hwp: false, hwpx: false }, ...o }) as Job
const draft = ['1번']

it('HML 은 해설을 고른 작업에서 해설이 끝났을 때만 해설지 탭이 있다', () => {
  expect(resultTabs(job({ features: ['typing', 'haesol'], draft }))).toEqual(['haesol'])
  expect(resultTabs(job({ features: ['typing'], draft }))).toEqual([])
  expect(resultTabs(job({ features: ['typing', 'haesol'], draft: [] }))).toEqual([])
})

it('HML 이 아니면 해설 줄(draft)만 있으면 해설지 탭이 있다', () => {
  expect(resultTabs(job({ inputType: 'PDF', draft }))).toEqual(['haesol'])
  expect(resultTabs(job({ inputType: 'PDF' }))).toEqual([])
})

it('결과 문서 파일이 있으면 결과 문서 탭이 있고, 타이핑만이면 그것만 있다', () => {
  const files = { hwp: false, hwpx: false, academyHwp: true }
  expect(resultTabs(job({ features: ['typing', 'haesol'], draft, files }))).toEqual(['haesol', 'academy'])
  expect(resultTabs(job({ features: ['typing'], files }))).toEqual(['academy'])
})
