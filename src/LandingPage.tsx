import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LandingViewer } from './LandingViewer'
import { LandingHero } from './LandingHero'
import { SubscriptionPlans } from './SubscriptionPlans'

// 고정 화면 구간의 스크롤 위치를 0~1 진행률로 바꾼다
export function scrollProgress(top: number, height: number, viewport: number) {
  return Math.max(0, Math.min(1, -top / Math.max(1, height - viewport)))
}

// 설명 하나의 스크롤 구간을 골라 동시 표시를 막는다
export function demoCopyStep(writing: number) {
  return Math.min(2, Math.floor(Math.max(0, Math.min(1, writing)) * 3))
}

// 영상 없이 문서 예시로 보여 주는 AI API 버전 랜딩 시안
export function LandingPage() {
  const demoRef = useRef<HTMLElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const [demoPage, setDemoPage] = useState(0)

  // 스크롤 위치로 설명과 풀이를 함께 제어해 역방향 스크롤도 그대로 되돌린다
  useEffect(() => {
    const section = demoRef.current
    if (!section) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const copies = section.querySelectorAll<HTMLElement>('.landing-demo-copy-step')
    const opening = section.querySelector<HTMLElement>('.landing-demo-opening')!
    const screen = section.querySelector<HTMLElement>('.landing-demo-window')!
    const sticky = section.querySelector<HTMLElement>('.landing-demo-sticky')!
    let frame = 0
    const update = () => {
      frame = 0
      const hero = heroRef.current!
      const heroRect = hero.getBoundingClientRect()
      const heroProgress = motion.matches ? 0 : scrollProgress(heroRect.top, heroRect.height, window.innerHeight)
      hero.style.setProperty('--hero-progress', String(heroProgress))
      // 그림이 먼저 흰 바탕으로 사라진 뒤 해설 화면을 드러낸다
      const heroFade = motion.matches ? 0 : Math.max(0, Math.min(1, (heroProgress - .15) / .4))
      const transition = motion.matches ? 1 : Math.max(0, Math.min(1, (heroProgress - .65) / .35))
      hero.style.opacity = String(1 - heroFade)
      section.style.opacity = String(transition)
      section.style.pointerEvents = transition > .5 ? '' : 'none'
      section.toggleAttribute('inert', transition <= .5)
      hero.toggleAttribute('inert', heroFade > .5)
      const photo = hero.querySelector<HTMLElement>('.landing-school-photo')
      if (photo) {
        photo.style.transform = `translate(${-heroProgress * 8}%, ${-heroProgress * 8}%) scale(${1.03 + heroProgress * .85})`
        photo.style.filter = `blur(${Math.max(0, Math.min(1, (heroProgress - .1) / .5)) * 12}px)`
      }
      hero.querySelector<HTMLElement>('.landing-life-copy')!.style.opacity = String(1 - Math.min(1, heroProgress / .35))
      hero.querySelector<HTMLElement>('.landing-life-bottom')!.style.opacity = String(1 - Math.min(1, heroProgress / .3))
      hero.querySelector<HTMLElement>('.landing-life-copy')!.style.transform = `translateY(${-heroProgress * 100}px)`
      const rect = section.getBoundingClientRect()
      const progress = scrollProgress(rect.top + (motion.matches ? 0 : window.innerHeight * .72), rect.height - (motion.matches ? 0 : window.innerHeight * .72), window.innerHeight)
      const move = Math.max(0, Math.min(1, progress / 0.48))
      const writing = Math.max(0, Math.min(1, (progress - 0.48) / 0.48))
      // 마지막 설명이 시작되기 전에 양쪽 단의 풀이를 완성한다
      const solutionProgress = Math.min(1, writing * 1.5)
      setDemoPage(solutionProgress > 2 / 3 ? 1 : 0)
      const exit = Math.max(0, Math.min(1, (progress - 0.84) / 0.16))
      const mobile = window.innerWidth <= 767
      screen.style.width = mobile ? '' : motion.matches ? '57%' : '740px'
      screen.style.setProperty('--live-height', mobile ? '40svh' : '500px')
      const finalScale = mobile ? 1 : Math.min(.88, sticky.clientWidth * .57 / screen.offsetWidth)
      const initialScale = mobile ? 1 : Math.min(sticky.clientWidth, 1440) * .92 / screen.offsetWidth
      const finalInset = Math.max(sticky.clientWidth * .06, (sticky.clientWidth - 1440) / 2 + 14)
      const finalX = sticky.clientWidth - finalInset - screen.offsetLeft - screen.offsetWidth * (1 + finalScale) / 2
      const initialX = sticky.clientWidth - screen.offsetLeft - screen.offsetWidth * (1 + initialScale) / 2
      const initialY = opening.offsetTop + opening.offsetHeight + 64 - window.innerHeight / 2 + screen.offsetHeight * initialScale / 2
      opening.style.opacity = String(motion.matches ? 0 : 1 - move)
      opening.style.transform = `translateY(${-move * 110}px)`
      opening.style.visibility = motion.matches || move === 1 ? 'hidden' : 'visible'
      screen.style.transform = motion.matches ? 'translateY(-50%)' : `translate3d(${mobile ? 0 : (1 - move) * initialX + move * finalX}px, calc(-50% + ${(mobile ? 0 : (1 - move) * initialY) - exit * window.innerHeight}px), 0) scale(${finalScale + (initialScale - finalScale) * (1 - move)}) perspective(2000px) rotateX(${mobile ? 0 : 5 * (1 - move)}deg) rotateY(${mobile ? 0 : 4 * (1 - move)}deg) rotateZ(${mobile ? 0 : 1 * (1 - move)}deg)`
      // 문항별 진행률을 본문 양쪽 단·썸네일·정답 목록에서 공유한다
      for (let i = 1; i <= 6; i++) {
        section.style.setProperty(`--solution-${i}`, String(motion.matches ? 1 : Math.max(0, Math.min(1, solutionProgress * 6 - i + 1))))
      }
      const activeCopy = demoCopyStep(writing)
      copies.forEach((copy, i) => {
        const visible = motion.matches ? i === 0 : move === 1 && i === activeCopy
        const phase = Math.max(0, Math.min(1, writing * 3 - i))
        const departure = i === 2 ? 0 : Math.max(0, (phase - .35) / .65)
        const baseTop = copy.offsetTop + copy.parentElement!.offsetTop
        copy.style.transform = motion.matches ? 'none' : `translateY(${-departure * (baseTop + copy.offsetHeight + 24) - exit * window.innerHeight}px)`
        const top = copy.getBoundingClientRect().top
        copy.style.opacity = String(!visible ? 0 : motion.matches ? 1 : move * Math.max(0, Math.min(1, (top + 24) / 64)))
        copy.style.visibility = visible ? 'visible' : 'hidden'
      })
      // 텍스트와 문서는 스크롤 위치에 연결해 역방향에서도 같은 동작을 되돌린다
      document.querySelectorAll<HTMLElement>('.landing-steps, .landing-scene').forEach(group => {
        group.classList.add('landing-scroll-reveal')
        const top = group.getBoundingClientRect().top
        const intro = group.closest<HTMLElement>('.landing-intro')
        const reveal = intro && window.innerWidth > 767
          ? scrollProgress(intro.getBoundingClientRect().top, intro.offsetHeight, window.innerHeight)
          : Math.max(0, Math.min(intro ? 1 : 2, (window.innerHeight * (intro ? .92 : .65) - top) / (window.innerHeight * (intro ? .95 : .25))))
        group.style.setProperty('--entrance', String(motion.matches ? 1 : reveal))
      })
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    motion.addEventListener('change', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      motion.removeEventListener('change', schedule)
    }
  }, [])

  return (
    <div className="landing">
      <a className="landing-skip" href="#landing-main">본문으로 바로가기</a>
      <header className="landing-header">
        <Link to="/" className="landing-logo" aria-label="풀이담 홈"><img className="header-bear-icon" src="/favicon.svg" width="32" height="32" alt="" />풀이담<span>수업 준비를 담다</span></Link>
        <nav aria-label="주 메뉴">
          <Link to="/jobs" className="landing-header-jobs">작업 목록</Link>
          <Link to="/subscribe">구독하기</Link>
          <Link to="/login">로그인</Link>
          <Link className="landing-nav-button" to="/start">시작하기</Link>
        </nav>
      </header>
      <main id="landing-main">
        <section className="landing-life" ref={heroRef} aria-labelledby="life-title">
          <div className="landing-life-sticky">
            <LandingHero />
          </div>
        </section>

        <section className="landing-demo" ref={demoRef} aria-labelledby="demo-title">
          <div className="landing-demo-sticky">
            <div className="landing-demo-opening">
              <p>풀이담 · 수업 준비를 담다</p>
              <h2 id="demo-title">시험지 한 장에서 시작하는<br />선생님만의 수업 준비</h2>
            </div>
            <div className="landing-demo-copy">
              <div className="landing-demo-copy-step">
                <p className="landing-eyebrow">01 · 시험지에서 해설지로</p>
                <h2>빈 해설지 위에,<br />풀이가 채워집니다</h2>
                <p>시험지 속 수학 문항을 읽고<br />AI가 한 문항씩 풀이 초안을 만듭니다</p>
              </div>
              <div className="landing-demo-copy-step">
                <p className="landing-eyebrow">02 · 문항별 풀이 초안</p>
                <h2>수식도, 풀이 과정도<br />한눈에 읽기 좋게</h2>
                <p>정답만 나열하는 대신 풀이 과정을 담습니다<br />문항별 수식과 설명을 한눈에 읽어보세요</p>
              </div>
              <div className="landing-demo-copy-step">
                <p className="landing-eyebrow">03 · 수업에 맞게 완성</p>
                <h2>풀이를 한곳에 모아,<br />한글 해설지로</h2>
                <p>만들어진 풀이를 편집 가능한 한글 파일로<br />다운로드한 뒤에도 자유롭게 수정하세요</p>
              </div>
            </div>
            <div className="landing-demo-window"><LandingViewer autoPage={demoPage} /></div>
          </div>
        </section>
        <section className="landing-intro" id="how">
          <div className="landing-intro-sticky">
          <p className="landing-eyebrow">복잡한 준비 대신, 간단한 흐름</p>
          <h2>풀이를 만드는 일부터<br />수업에 쓰는 순간까지</h2>
          <div className="landing-steps">
            <article><span>01</span><h3>쓰던 시험지를 올리고</h3><p>HWP, HWPX, PDF.<br />다시 입력할 필요 없이 시작하세요</p><div className="landing-formats">HWP <i>·</i> HWPX <i>·</i> PDF</div></article>
            <article><span>02</span><h3>문항별 풀이를 한눈에</h3><p>문항별 풀이를 한곳에서 확인하세요<br />수식과 풀이 과정을 함께 담습니다</p><div className="landing-review-label">수식 · 풀이 과정</div></article>
            <article><span>03</span><h3>한글 해설지로 받아보세요</h3><p>만들어진 풀이를 한 파일로<br />받은 뒤에도 한글에서 편집할 수 있어요</p><div className="landing-download-label">↓ 정답 및 해설hwpx</div></article>
          </div>
          </div>
        </section>
        <section className="landing-hero">
          <p className="landing-eyebrow">선생님의 시간은, 수업에</p>
          <h2>시험지는 그대로<br />해설 준비는 <span>더 가볍게</span></h2>
          <p className="landing-description">시험지를 올리면 AI가 풀이 초안을 만듭니다<br />문항별 풀이를 모아, 한글 해설지로</p>
          <div className="landing-scene" id="example" aria-label="시험지와 해설지 디자인 예시">
            <div className="landing-paper landing-original">
              <div className="landing-paper-top"><span>MATHEMATICS</span><span>시험지 예시</span></div>
              <h2>수학 Ⅰ <small>중간고사</small></h2>
              <div className="landing-paper-rule" />
              <div className="landing-paper-content">
              <p className="landing-question"><b>01.</b> 이차함수 f(x) = x² − 4x + 3의<br />최솟값을 구하시오</p>
              <div className="landing-math">f(x) = x² − 4x + 3</div>
              <svg className="landing-graph" viewBox="0 0 260 145" role="img" aria-label="꼭짓점이 (2, -1)인 이차함수 그래프">
                <path d="M20 95H245 M75 135V10" stroke="#b7c4d5" strokeWidth="1" />
                <path d="M60 22 Q140 212 220 22" stroke="#4779c6" strokeWidth="2.5" fill="none" />
                <circle cx="140" cy="117" r="4" fill="#4779c6" />
                <text x="149" y="135" fill="#68758a" fontSize="12">(2, −1)</text>
                <text x="237" y="111" fill="#68758a" fontSize="12">x</text>
              </svg>
              <p className="landing-question"><b>02.</b> 다음 방정식의 해를 구하시오</p>
              <div className="landing-math landing-math-small">2x² − 5x + 2 = 0</div>
              </div>
              <span className="landing-page-number">1</span>
            </div>
            <div className="landing-transfer" aria-hidden="true">↗</div>
            <div className="landing-paper landing-solution">
              <div className="landing-paper-top"><span>WITH 풀이담</span><span>해설지 예시</span></div>
              <h2>수학 Ⅰ <small>정답 및 해설</small></h2>
              <div className="landing-paper-rule" />
              <div className="landing-paper-content">
              <div className="landing-answer-heading"><b>01. 풀이</b><span>풀이 예시</span></div>
              <p>주어진 식을 완전제곱식으로 정리하면</p>
              <div className="landing-equation">f(x) = (x − 2)² − 1</div>
              <p>(x − 2)² ≥ 0이므로<br />x = 2일 때 최솟값은 −1이다</p>
              <div className="landing-answer">정답 <strong>−1</strong></div>
              <div className="landing-answer-heading"><b>02. 풀이</b><span>풀이 예시</span></div>
              <div className="landing-equation">(2x − 1)(x − 2) = 0</div>
              <p>따라서 x = ½ 또는 x = 2이다</p>
              </div>
              <span className="landing-page-number">1</span>
            </div>
            <div className="landing-file-chip"><span aria-hidden="true">↳</span> 편집 가능한 한글 해설지 <b>.hwpx</b></div>
          </div>
        </section>
        <SubscriptionPlans />
      </main>
      <footer className="landing-footer"><b>풀이담 <span>수업 준비를 담다</span></b><p>시험지에서 풀이까지, 수업 준비를 한곳에서</p><small>현재 시안에서는 AI 실행을 제공하지 않습니다</small></footer>
    </div>
  )
}
