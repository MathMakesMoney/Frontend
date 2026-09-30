import { useLayoutEffect, useRef, useState } from 'react'
import { HaesolPage, type HaesolLayout } from './features/result/haesolPages'

const problems = [
  [
    '1번  정답 −1',
    '이차함수의 최솟값은 꼭짓점에서 구한다',
    '주어진 식은 다음과 같다',
    '<<EQ>>f(x)=x^{2}-4x+3<</EQ>>',
    '완전제곱식을 만들기 위해 1을 더하고 뺀다',
    '<<EQ>>f(x)=x^{2}-4x+4-1<</EQ>>',
    '<<EQ>>=(x-2)^{2}-1<</EQ>>',
    '실수의 제곱은 항상 0 이상이므로',
    '<<EQ>>(x-2)^{2} GEQ 0<</EQ>>',
    '따라서 <<EQ>>f(x) GEQ -1<</EQ>>이다',
    '등호는 <<EQ>>x-2=0<</EQ>>일 때 성립한다',
    '즉, <<EQ>>x=2<</EQ>>에서 최솟값을 갖는다',
    '원래 식에 대입하여 확인하면',
    '<<EQ>>f(2)=4-8+3=-1<</EQ>>',
    '따라서 구하는 최솟값은 −1이다',
  ],
  [
    '2번  정답 ½, 2',
    '주어진 이차방정식의 해를 구한다',
    '<<EQ>>2x^{2}-5x+2=0<</EQ>>',
    '가운데 항을 나누어 묶으면',
    '<<EQ>>2x^{2}-4x-x+2=0<</EQ>>',
    '<<EQ>>2x(x-2)-(x-2)=0<</EQ>>',
    '공통인 인수를 묶어 인수분해한다',
    '<<EQ>>(2x-1)(x-2)=0<</EQ>>',
    '두 인수의 곱이 0이므로',
    '<<EQ>>2x-1=0<</EQ>> 또는 <<EQ>>x-2=0<</EQ>>',
    '따라서 <<EQ>>x={1} over {2}<</EQ>>, <<EQ>>x=2<</EQ>>이다',
    '두 근의 합과 곱으로 검산하면',
    '<<EQ>>{1} over {2}+2={5} over {2}<</EQ>>',
    '<<EQ>>{1} over {2} TIMES 2=1<</EQ>>',
    '근과 계수의 관계에도 일치한다',
  ],
  [
    '3번  정답 5',
    '함숫값은 주어진 입력값을 대입해 구한다',
    '주어진 일차함수는',
    '<<EQ>>f(x)=2x+1<</EQ>>이다',
    '<<EQ>>f(2)<</EQ>>는 입력값이 2일 때의 값이다',
    '식의 모든 <<EQ>>x<</EQ>>를 2로 바꾸면',
    '<<EQ>>f(2)=2 TIMES 2+1<</EQ>>',
    '곱셈을 먼저 계산한다',
    '<<EQ>>2 TIMES 2=4<</EQ>>',
    '이 값에 상수항 1을 더한다',
    '<<EQ>>f(2)=4+1=5<</EQ>>',
    '그래프 위의 점으로 표현하면',
    '<<EQ>>(2,5)<</EQ>>가 이 직선 위에 있다',
    '따라서 구하는 함숫값은 5이다',
  ],
  [
    '4번  정답 x > 2',
    '주어진 일차부등식의 해를 구한다',
    '<<EQ>>3x-1>5<</EQ>>',
    '양변에 같은 수 1을 더하면',
    '<<EQ>>3x-1+1>5+1<</EQ>>',
    '<<EQ>>3x>6<</EQ>>',
    '양변을 양수 3으로 나눈다',
    '양수로 나누면 부등호의 방향은 유지된다',
    '<<EQ>>x>2<</EQ>>',
    '경계값 2를 대입하면 양변이 모두 5이다',
    '엄격한 부등식이므로 2는 포함하지 않는다',
    '예를 들어 <<EQ>>x=3<</EQ>>이면',
    '<<EQ>>3 TIMES 3-1=8>5<</EQ>>로 성립한다',
    '따라서 해는 2보다 큰 모든 실수이다',
  ],
  [
    '5번  정답 2',
    '두 직선의 교점에서는 좌표가 같다',
    '첫 번째 직선은 <<EQ>>y=2x+1<</EQ>>',
    '두 번째 직선은 <<EQ>>y=x+3<</EQ>>이다',
    '같은 교점의 y좌표를 나타내므로',
    '<<EQ>>2x+1=x+3<</EQ>>',
    '양변에서 x를 빼면',
    '<<EQ>>x+1=3<</EQ>>',
    '양변에서 1을 빼면 <<EQ>>x=2<</EQ>>이다',
    '이 값을 첫 번째 직선에 대입하면',
    '<<EQ>>y=2 TIMES 2+1=5<</EQ>>',
    '두 번째 직선에서도 <<EQ>>y=2+3=5<</EQ>>이다',
    '따라서 두 직선의 교점은 <<EQ>>(2,5)<</EQ>>이다',
    '구하는 교점의 x좌표는 2이다',
  ],
  [
    '6번  정답 4',
    '직각삼각형의 빗변의 길이는 5이다',
    '나머지 두 변의 길이는 3과 a이다',
    '피타고라스 정리에 의해',
    '<<EQ>>a^{2}+3^{2}=5^{2}<</EQ>>',
    '각 제곱을 계산하면',
    '<<EQ>>a^{2}+9=25<</EQ>>',
    '양변에서 9를 빼면',
    '<<EQ>>a^{2}=16<</EQ>>',
    '이를 만족하는 실수는 4와 −4이다',
    '하지만 변의 길이는 양수이므로',
    '<<EQ>>a=4<</EQ>>만 가능하다',
    '구한 값을 원래 관계에 대입하면',
    '<<EQ>>4^{2}+3^{2}=16+9=25=5^{2}<</EQ>>',
    '따라서 구하는 변의 길이는 4이다',
  ],
]
const lines = problems.flat()
let start = 0
const blocks = problems.map(problem => {
  const block = problem.map((_, i) => start + i)
  start += problem.length
  return block
})
const layout: HaesolLayout = {
  title: '수학 Ⅰ 중간고사 해설', lines,
  labels: problems.flatMap((problem, i) => problem.map(() => String(i + 1))),
  pages: [{ blocks: blocks.slice(0, 4), labels: ['1', '2', '3', '4'] }, { blocks: blocks.slice(4), labels: ['5', '6'] }],
  measure: null,
}
const header = '고등학교 1학년 · 중간고사 · 정답 및 해설 예시'

// 실제 해설지 렌더러로 그리는 3칸 시안: 쪽과 문항을 누르면 해당 쪽을 전체 크기에 맞춰 보여 준다
export function LandingViewer({ autoPage }: { autoPage: number }) {
  const stage = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(0)
  const [active, setActive] = useState<string | null>(null)

  // 풀이 진행에 맞춰 중앙 본문도 다음 쪽으로 넘기고 역스크롤하면 되돌린다
  useLayoutEffect(() => { setCurrent(autoPage); setActive(null) }, [autoPage])

  useLayoutEffect(() => {
    const el = stage.current!
    const resize = () => el.style.setProperty('--sheet-scale', String(Math.max(0.1, Math.min((el.clientWidth - 24) / 794, (el.clientHeight - 24) / 1123))))
    const observer = new ResizeObserver(resize)
    observer.observe(el)
    resize()
    return () => observer.disconnect()
  }, [])

  function select(page: number, label: string | null = null) {
    setCurrent(page)
    setActive(label)
  }

  return (
    <div className="landing-live-viewer">
      <div className="landing-live-bar"><b>수학 Ⅰ 중간고사</b><span>해설지 보기 · 예시</span></div>
      <div className="landing-live-grid">
        <aside className="landing-live-thumbs" aria-label="해설지 쪽 목록">
          <div className="landing-live-panel-title"><b>쪽 목록</b><span>2쪽</span></div>
          {layout.pages.map((page, i) => (
            <button type="button" key={i} className={current === i ? 'current' : ''} aria-label={`${i + 1}쪽 보기`} aria-current={current === i ? 'page' : undefined} onClick={() => select(i)}>
              <span className="landing-live-thumb"><span><HaesolPage jobId="demo" header={header} layout={layout} index={i} /></span></span>
              <span>{i + 1} <small>{page.labels.length}문항</small></span>
            </button>
          ))}
        </aside>
        <div className="landing-live-stage" ref={stage} aria-label="해설지 본문" tabIndex={0}>
          {[current].map(i => <div className="landing-live-page-box" data-live-page={i} key={i}><div className="landing-live-page-inner"><HaesolPage jobId="demo" header={header} layout={layout} index={i} active={active} /></div></div>)}
        </div>
        <aside className="landing-live-index" aria-label="문항별 정답 목록">
          <div className="landing-live-panel-title"><b>문항 목록</b><span>6문항</span></div>
          {layout.pages.map((page, i) => <div className={current === i ? 'current' : ''} key={i}><h3>▾ {i + 1}쪽 <small>{page.labels.length}문항</small></h3>{page.labels.map(label => <button type="button" key={label} data-solution-label={label} className={active === label ? 'active' : ''} onClick={() => select(i, label)}><b>{label}번</b><span>정답 {problems[Number(label) - 1][0].split('정답 ')[1]}</span></button>)}</div>)}
        </aside>
      </div>
      <div className="landing-live-note">문항별 풀이와 한글 해설지 화면 예시</div>
    </div>
  )
}
