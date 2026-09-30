// 수업을 준비하는 캐릭터와 해설지로 서비스의 사용 맥락을 보여 준다
export function LandingHero() {
  return (
    <div className="landing-school-hero">
      <img className="landing-school-photo" src="/bear-study-facing-bear.png" width="1600" height="900" alt="책상에서 수학 시험지를 푸는 백곰 캐릭터" fetchPriority="high" />
      <div className="landing-paper-wash" aria-hidden="true" />
      <div className="landing-life-copy">
        <p>풀이담 · 수업 준비의 새로운 시작</p>
        <h1 id="life-title">수업에 집중할 시간,<br />해설 준비는 풀이담에</h1>
        <p className="landing-life-description">시험지를 올리면 문항별 풀이부터<br />편집 가능한 한글 해설지까지</p>

      </div>
      <div className="landing-life-bottom"><span>시험지는 그대로 해설 준비는 더 가볍게</span><span>스크롤해 보세요 ↓</span></div>
    </div>
  )
}
