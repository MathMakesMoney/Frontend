import { expect, test } from 'vitest'
import { fileTitle } from './fileTitle'

test('파일명이 기본 제목이며 직접 바꾼 제목은 유지한다', () => {
  expect(fileTitle('', '', '수학.중간고사.HWPX')).toBe('수학.중간고사')
  expect(fileTitle('수학.중간고사', '수학.중간고사.HWPX', '기말.pdf')).toBe('기말')
  expect(fileTitle('내 수업 자료', '중간.pdf', '기말.pdf')).toBe('내 수업 자료')
  expect(fileTitle('', '', '시험지')).toBe('시험지')
})
