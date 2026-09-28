import { describe, expect, it } from 'vitest'
import { toLatex } from './hwpeq'

// 입력은 실제 작업(/api/jobs/1)과 PoC 결과 JSON 에서 뽑은 한글 수식 스크립트
const cases: [string, string][] = [
  // 이중 프라임: 따옴표를 붙여 써야 KaTeX 가 이중 위첨자로 보지 않는다 (광덕고 20-2번 풀이)
  ["f''(x)", "f '' ( x )"],
  ["overline{A'Q}=overline{A''Q}", "\\overline{A ' Q} = \\overline{A '' Q}"],
  ["A'''", "A '''"],
  // 분수: over 는 양옆 한 덩어리(그룹이나 토큰)를 묶는다
  ['{1} over {2}', '\\frac{1}{2}'],
  ['a over b', '\\frac{a}{b}'],
  ['{dx} over {dt} varpropto 6+ pi', '\\frac{dx}{dt} \\varpropto 6 + \\pi'],
  ['- {3} over {2} a _{1}', '- \\frac{3}{2} a_{1}'],
  ['{{34} over {25}} over {1- {9} over {25}}', '\\frac{\\frac{34}{25}}{1 - \\frac{9}{25}}'],
  ['{17/6} over {-1/2}', '\\frac{17 / 6}{- 1 / 2}'],
  ['1 OVER 2', '\\frac{1}{2}'],
  // 근호
  ['sqrt {13}', '\\sqrt{13}'],
  ['sqrt x', '\\sqrt{x}'],
  ['sqrt {n ^{2} +4}', '\\sqrt{n^{2} + 4}'],
  ['{3 pm sqrt {13}} over {2}', '\\frac{3 \\pm \\sqrt{13}}{2}'],
  ['root {3} of {n}', '\\sqrt[3]{n}'],
  ['root {3} {k}', '\\sqrt[3]{k}'],
  // 첨자
  ['x ^{2}', 'x^{2}'],
  ['A _{k}', 'A_{k}'],
  ['a _{n} ^{2}', 'a_{n}^{2}'],
  ['u ^{3/2}', 'u^{3 / 2}'],
  ['x^2', 'x^{2}'],
  // 괄호
  ['LEFT ( x RIGHT )', '\\left( x \\right)'],
  ['k in LEFT { pm 3, pm 4 RIGHT }', 'k \\in \\left\\{ \\pm 3 , \\pm 4 \\right\\}'],
  ['LEFT | r RIGHT | <1', '\\left| r \\right| < 1'],
  ['LEFT [ {2} over {3} u RIGHT ]_{0} ^{1}', '\\left[ \\frac{2}{3} u \\right]_{0}^{1}'],
  ['LEFT { matrix{x+2y=1 ## 2x-3y=9} ', '\\left\\{ \\begin{matrix}x + 2 y = 1 \\\\ 2 x - 3 y = 9\\end{matrix} \\right.'],
  ['3 times LEFT ( rm RIGHT .', '3 \\times \\left( \\right.'],
  ['a RIGHT )', 'a )'],
  ['{dt} over {d theta } LEFT vert _{ theta _{0} }', '\\frac{dt}{d \\theta} \\left| {}_{\\theta_{0}} \\right.'],
  ['β =2', 'β = 2'],
  ['M= LEFT lfloor n RIGHT rfloor', 'M = \\left\\lfloor n \\right\\rfloor'],
  ['aLEFT (16-t RIGHT ) =6', 'a \\left( 16 - t \\right) = 6'],
  // 글꼴
  ['overline {AB}', '\\overline{AB}'],
  ['rm A', '\\mathrm{A}'],
  ['overrightarrow {rm OS} =t', '\\overrightarrow{\\mathrm{OS}} = t'],
  ['rm A it x', '\\mathrm{A} x'],
  ['bold v', '\\mathbf{v}'],
  // 연산자, 관계, 집합
  ['12 times 3 cdot 2 div 1', '12 \\times 3 \\cdot 2 \\div 1'],
  ['A SMALLINTER B CUP C', 'A \\cap B \\cup C'],
  ['x IN A, y notin B', 'x \\in A , y \\notin B'],
  ['A SUBSET B SUPERSET C', 'A \\subset B \\supset C'],
  ['x GEQ 0 LEQ 1', 'x \\geq 0 \\leq 1'],
  ['a != 0, a<=b, b>=c', 'a \\neq 0 , a \\leq b , b \\geq c'],
  ['tan 6x sim 6x', '\\tan 6 x \\sim 6 x'],
  ['f( theta ) approx 2 theta', 'f ( \\theta ) \\approx 2 \\theta'],
  // 그리스 문자: 소문자 이름은 소문자, 대문자 이름은 대문자
  ['pi alpha beta lambda varphi', '\\pi \\alpha \\beta \\lambda \\varphi'],
  ['PI SIGMA', '\\Pi \\Sigma'],
  // 적분, 합, 극한, 로그
  ['int _{0} ^{2} f(x) dx', '\\int_{0}^{2} f ( x ) dx'],
  ['INT_{1} ^{2} x ln x dx', '\\int_{1}^{2} x \\ln x dx'],
  ['sum _{k=1} ^{n} a _{k}', '\\sum_{k = 1}^{n} a_{k}'],
  ['SUM_{n=1} ^{INF} b _{n}', '\\sum_{n = 1}^{\\infty} b_{n}'],
  ['lim _{x -> 0}', '\\lim_{x \\to 0}'],
  ['lim _{n rarrow inf} S _{n}', '\\lim_{n \\rightarrow \\infty} S_{n}'],
  ['LIM_{h → 0}', '\\lim_{h \\to 0}'],
  ['log _{3} a', '\\log_{3} a'],
  ['sin theta cos x tan x', '\\sin \\theta \\cos x \\tan x'],
  // 프라임, 점, 간격
  ["f'(x)", "f ' ( x )"],
  ['f prime (x) Prime', "f ' ( x ) '"],
  ['1, cdots , n', '1 , \\cdots , n'],
  ['0.1 dot {3}', '0.1 \\dot{3}'],
  ['b _{1} =0,`b', 'b_{1} = 0 , \\, b'],
  [',~ alpha', ', \\  \\alpha'],
  // 도형 기호
  ['angle BAC =54°', '\\angle BAC = 54^{\\circ}'],
  ['triangle ABC', '\\triangle ABC'],
  ['AB BOT CD, l parallel m', 'AB \\perp CD , l \\parallel m'],
  ['therefore x', '\\therefore x'],
  ['k=±3, f≠0', 'k = \\pm 3 , f \\neq 0'],
  // 모르는 단어는 글자 그대로
  ['8at + xf', '8 at + xf'],
  // 수식 안 한글은 \text
  ['(삼각형 AOD의 넓이)', '( \\text{삼각형 } AOD \\text{의} \\text{ 넓이} )'],
  ['LEFT ( rm 가 RIGHT )', '\\left( \\text{가} \\right)'],
  ['a & (log _{3} a "이 자연수인 경우")', 'a \\& ( \\log_{3} a \\text{이 자연수인 경우} )'],
  // 경우 나누기
  ['f(x)= cases {3x+a & (x LEQ 1) # 2 & (x>1)}', 'f ( x ) = \\begin{cases}3 x + a & ( x \\leq 1 ) \\\\ 2 & ( x > 1 )\\end{cases}'],
  ['CASES{5 &(x) # 1}', '\\begin{cases}5 & ( x ) \\\\ 1\\end{cases}'],
  // LaTeX 특수 문자는 글자로
  ['50% # $ \\', '50 \\% \\# \\$ \\backslash'],
  // 짝 없는 괄호에 죽지 않는다
  ['{a', '{a}'],
  ['a}', 'a'],
]

describe('toLatex', () => {
  it.each(cases)('%s', (script, latex) => {
    expect(toLatex(script)).toBe(latex)
  })
})
