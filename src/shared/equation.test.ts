import { describe, expect, it } from 'vitest'
import { joinEquation, splitEquation } from './equation'

// CLAUDE.md 에 적힌 나누기 테스트 그대로
describe('splitEquation', () => {
  it('글자와 수식을 나눈다', () => {
    expect(splitEquation('가 <<EQ>>x ^{2}<</EQ>> 이다')).toEqual([
      { type: 'text', value: '가 ' },
      { type: 'eq', value: 'x ^{2}' },
      { type: 'text', value: ' 이다' },
    ])
  })

  it('수식이 없으면 글자 하나만 반환한다', () => {
    expect(splitEquation('그냥 글자')).toEqual([{ type: 'text', value: '그냥 글자' }])
  })

  it('닫는 표시가 없으면 나머지를 글자로 둔다', () => {
    expect(splitEquation('가 <<EQ>>x ^{2} 깨짐')).toEqual([
      { type: 'text', value: '가 ' },
      { type: 'text', value: '<<EQ>>x ^{2} 깨짐' },
    ])
  })
})

describe('joinEquation', () => {
  it('나눈 조각을 다시 이으면 원문과 바이트가 같다', () => {
    const samples = ['', '그냥 글자', '가 <<EQ>>x ^{2}<</EQ>> 이다', '<<EQ>>a<</EQ>><<EQ>>b<</EQ>>', '가 <<EQ>>x ^{2} 깨짐',
      '<<EQ>><</EQ>>', '줄1\n<<EQ>>{1} over {2}<</EQ>>\n\n  줄3 ', '<</EQ>> 거꾸로 <<EQ>>', '탭\t|  칸 | <<EQ>>rm A<</EQ>>']
    for (const s of samples) expect(joinEquation(splitEquation(s))).toBe(s)
  })
})
