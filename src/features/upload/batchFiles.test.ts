import { expect, it } from 'vitest'
import { applyCommon, EMPTY_COMMON, newRow, pickFiles, toggleFeature } from './batchFiles'

const f = (name: string) => new File(['x'], name)

it('지원하는 파일이 2개 이상이면 묶음: hml·hwp·hwpx·pdf 를 섞어 이름순으로 담고 나머지는 알린다', () => {
  const { files, skipped } = pickFiles([f('시험 10.hml'), f('시험 2.hml'), f('a.pdf'), f('memo.txt'), f('.DS_Store')])
  expect(files.map(x => x.name)).toEqual(['시험 2.hml', '시험 10.hml', 'a.pdf'])  // 한국어 이름순 (한글 먼저)
  expect(skipped).toEqual(['memo.txt'])
})

it('지원하는 파일이 하나면 그 파일 하나만 담는다', () => {
  expect(pickFiles([f('a.hml')]).files.map(x => x.name)).toEqual(['a.hml'])
  const { files, skipped } = pickFiles([f('a.pdf'), f('memo.txt')])
  expect(files.map(x => x.name)).toEqual(['a.pdf'])
  expect(skipped).toEqual(['memo.txt'])
})

it('묶음 시험지 줄은 쪽 범위·시험 범위 칸을 비워 시작한다', () => {
  expect(newRow(f('기말.pdf'))).toMatchObject({ title: '기말', pages: '', range: '', features: ['typing'] })
})

it('변형을 켜면 해설이 같이 켜지고, 변형이 켜진 동안 해설은 끌 수 없다', () => {
  expect(toggleFeature(['typing'], 'variant', true)).toEqual(['typing', 'haesol', 'variant'])
  expect(toggleFeature(['typing', 'haesol', 'variant'], 'haesol', false)).toEqual(['typing', 'haesol', 'variant'])
  expect(toggleFeature(['typing', 'haesol', 'variant'], 'variant', false)).toEqual(['typing', 'haesol'])
  expect(toggleFeature(['haesol'], 'typing', true)).toEqual(['typing', 'haesol'])
})

it('공통 값은 빈 칸이면 시험지 값을 지우지 않고 기능은 덮어쓴다', () => {
  const rows = [{ ...newRow(f('중간.hml')), school: '한국고', scope: '기하' }, newRow(f('기말.hml'))]
  expect(rows[1].title).toBe('기말')
  const next = applyCommon(rows, { ...EMPTY_COMMON, scope: '확률과 통계', features: ['typing', 'haesol'] })
  expect(next.map(r => [r.scope, r.school, r.features])).toEqual([
    ['확률과 통계', '한국고', ['typing', 'haesol']],
    ['확률과 통계', '', ['typing', 'haesol']],
  ])
})
