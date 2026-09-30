import { expect, it } from 'vitest'
import { visibleJobs } from './JobListPage'
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
