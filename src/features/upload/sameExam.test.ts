import { expect, it } from 'vitest'
import { keptIndexes, sameExamGroups } from './sameExam'

const f = (name: string, path = '') => ({ name, webkitRelativePath: path })

it('확장자를 뗀 이름이 같으면 같은 시험지: 형식이 달라도, 대소문자가 달라도 묶는다', () => {
  expect(sameExamGroups([f('중간.hml'), f('기말.hwpx'), f('중간.PDF'), f('Final.hwp'), f('final.pdf')])).toEqual([[0, 2], [3, 4]])
})

it('이름이 다르면 묶지 않는다 (중간.hml 과 중간2.pdf, 파일 하나)', () => {
  expect(sameExamGroups([f('중간.hml'), f('중간2.pdf'), f('기말.pdf')])).toEqual([])
})

it('폴더째 올릴 때는 같은 폴더 안에서만 같은 시험지: 다른 폴더의 같은 이름은 다른 시험지', () => {
  const picked = [f('중간.hml', '시험/1반/중간.hml'), f('중간.pdf', '시험/1반/중간.pdf'), f('중간.hml', '시험/2반/중간.hml')]
  expect(sameExamGroups(picked)).toEqual([[0, 1]])
})

it('맥(분해)과 윈도(조합)로 저장된 한글 이름도 같은 이름으로 본다', () => {
  expect(sameExamGroups([f('중간.hml'.normalize('NFD')), f('중간.pdf'.normalize('NFC'))])).toEqual([[0, 1]])
})

it('고른 것만 남긴다: 안 고른 묶음은 모두 남기고(올리기 전에 막는다), 고른 묶음은 하나만', () => {
  const groups = [[0, 2], [3, 4]]
  expect(keptIndexes(5, groups, { 0: 2 })).toEqual([1, 2, 3, 4])
  expect(keptIndexes(5, groups, { 0: 0, 3: 4 })).toEqual([0, 1, 4])
  expect(keptIndexes(3, [], {})).toEqual([0, 1, 2])
})
