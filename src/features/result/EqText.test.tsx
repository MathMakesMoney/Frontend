import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Part } from '../../shared/equation'
import { EqText, fromRows, replaceFragment, toRows } from './EqText'

const t = (value: string): Part => ({ type: 'text', value })
const q = (value: string): Part => ({ type: 'eq', value })
const stem = '함수 <<EQ>>f(x)=x ^{2}<</EQ>> 에 대하여\n<<EQ>>a<</EQ>><<EQ>>b<</EQ>>'

describe('toRows / fromRows', () => {
  it('줄마다 글·수식 조각으로 나누고, 줄 처음·끝·수식 사이에 빈 글 조각을 둔다', () => {
    expect(toRows(stem)).toEqual([
      [t('함수 '), q('f(x)=x ^{2}'), t(' 에 대하여')],
      [t(''), q('a'), t(''), q('b'), t('')],
    ])
    expect(toRows('')).toEqual([[t('')]])
  })

  it('줄바꿈이 든 수식은 한 조각으로 둔다', () => {
    expect(toRows('<<EQ>>a\nb<</EQ>> 끝')).toEqual([[t(''), q('a\nb'), t(' 끝')]])
  })

  it('다시 이으면 원문과 바이트가 같다 (고치지 않은 칸은 그대로 나간다)', () => {
    const samples = [stem, '', '\n', '그냥 글자', '가 <<EQ>>x ^{2} 깨짐\n다음', '<<EQ>><</EQ>>', ' 앞뒤 공백 \n\n  <<EQ>>rm A<</EQ>>  ',
      '<<EQ>>a\nb<</EQ>>', '[그림] |  칸 | <<EQ>>rm B<</EQ>>\t탭', '<</EQ>> 거꾸로 <<EQ>>']
    for (const s of samples) expect(fromRows(toRows(s))).toBe(s)
  })
})

describe('replaceFragment', () => {
  it('글 조각만 고치고 다른 조각은 바이트 그대로', () => {
    expect(replaceFragment(stem, 0, 2, [t(' 에 대해')])).toBe('함수 <<EQ>>f(x)=x ^{2}<</EQ>> 에 대해\n<<EQ>>a<</EQ>><<EQ>>b<</EQ>>')
  })

  it('수식 스크립트를 고친다', () => {
    expect(replaceFragment(stem, 1, 3, [q('c')])).toBe('함수 <<EQ>>f(x)=x ^{2}<</EQ>> 에 대하여\n<<EQ>>a<</EQ>><<EQ>>c<</EQ>>')
  })

  it('수식 넣기: 글 조각을 커서 자리에서 나눠 넣는다', () => {
    expect(replaceFragment(stem, 0, 0, [t('함'), q('y'), t('수 ')])).toBe('함<<EQ>>y<</EQ>>수 <<EQ>>f(x)=x ^{2}<</EQ>> 에 대하여\n<<EQ>>a<</EQ>><<EQ>>b<</EQ>>')
  })

  it('수식 사이 빈 자리에 글을 넣는다', () => {
    expect(replaceFragment(stem, 1, 2, [t(' 와 ')])).toBe('함수 <<EQ>>f(x)=x ^{2}<</EQ>> 에 대하여\n<<EQ>>a<</EQ>> 와 <<EQ>>b<</EQ>>')
  })

  it('수식을 지운다', () => {
    expect(replaceFragment(stem, 0, 1, [])).toBe('함수  에 대하여\n<<EQ>>a<</EQ>><<EQ>>b<</EQ>>')
  })
})

describe('EqText', () => {
  it('글은 그대로, 수식은 그린 모양의 버튼(라벨에 원문 스크립트)으로 보인다', () => {
    const html = renderToStaticMarkup(<EqText value={stem} label="발문" onChange={() => {}} />)
    expect(html).toContain('role="group" aria-label="발문"')
    expect(html).toContain('aria-label="수식 f(x)=x ^{2}"')
    expect(html).toContain('class="katex"')
    expect(html).toContain('함수 ')
    expect(html).not.toContain('&lt;&lt;EQ')
    expect(html.match(/<button/g)?.length).toBe(3)
  })
})
