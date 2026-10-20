import { expect, it } from 'vitest'
import { groupBatches, visibleJobs } from './JobListPage'
import type { Job } from '../../shared/api'

it('검색과 상태를 함께 적용하고 원본을 유지하며 날짜순으로 정렬한다', () => {
  const jobs = [
    { id: '1', title: '중간고사', school: '한국고', scope: '수학Ⅰ', stage: 'done', createdAt: '2026-09-01' },
    { id: '2', title: '기말고사', school: '한국고', scope: '기하', stage: 'solving', createdAt: '2026-10-01' },
    { id: '3', title: '연습 시험', school: '다른고', scope: '기하', stage: 'uploaded', createdAt: '2026-08-01' },
  ] as Job[]
  expect(visibleJobs(jobs, ' 한국고 ', 'all', 'latest').map(job => job.id)).toEqual(['2', '1'])
  expect(visibleJobs(jobs, '기하', 'working', 'latest').map(job => job.id)).toEqual(['2'])
  expect(visibleJobs(jobs, '', 'uploaded', 'latest').map(job => job.id)).toEqual(['3'])
  expect(visibleJobs(jobs, '', 'done', 'latest').map(job => job.id)).toEqual(['1'])
  expect(visibleJobs(jobs, '', 'all', 'oldest').map(job => job.id)).toEqual(['3', '1', '2'])
  expect(visibleJobs(jobs, '없음', 'all', 'latest')).toEqual([])
  expect(jobs.map(job => job.id)).toEqual(['1', '2', '3'])
})

it('묶음 작업은 묶음 번호로 모아 시험지 순서대로 두고 나머지는 낱개로 둔다', () => {
  const jobs = [
    { id: '3', batch: { id: '1', name: '중간', order: 2 } },
    { id: '9' },
    { id: '1', batch: { id: '1', name: '중간', order: 1 } },
  ] as Job[]
  const { batches, singles } = groupBatches(jobs)
  expect(batches.map(b => [b.id, b.name, b.jobs.map(j => j.id)])).toEqual([['1', '중간', ['1', '3']]])
  expect(singles.map(j => j.id)).toEqual(['9'])
})

it('진행(progress)이 있으면 그것으로 상태를 가른다: 해설·보류·실패는 진행 중, 완료만 완료', () => {
  const jobs = [
    { id: '1', stage: 'done', progress: 'haesol', createdAt: '2026-10-01' },
    { id: '2', stage: 'done', progress: 'hold', createdAt: '2026-10-02' },
    { id: '3', stage: 'done', progress: 'done', createdAt: '2026-10-03' },
    { id: '4', stage: 'done', progress: 'failed', createdAt: '2026-10-04' },
  ] as Job[]
  expect(visibleJobs(jobs, '', 'working', 'oldest').map(j => j.id)).toEqual(['1', '2', '4'])
  expect(visibleJobs(jobs, '', 'done', 'oldest').map(j => j.id)).toEqual(['3'])
})
