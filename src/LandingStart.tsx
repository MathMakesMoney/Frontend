import { Link } from 'react-router-dom'

// 시험지를 올리기 전에 풀이를 만들 AI 이용 방식을 고른다
export function LandingStart() {
  return (
    <main className="landing-login landing-start">
      <header className="landing-login-header">
        <Link to="/" className="landing-login-exit" aria-label="처음 화면으로 돌아가기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5l-7 7 7 7M7 12h14" /></svg></Link>
        <Link to="/" className="landing-login-brand"><img className="header-bear-icon" src="/favicon.svg" width="32" height="32" alt="" />풀이담</Link>
        <Link to="/jobs" className="landing-header-jobs">작업 목록</Link>
        <Link to="/login" className="landing-start-login">로그인</Link>
      </header>
      <section className="landing-start-content" aria-labelledby="start-title">
        <p className="landing-eyebrow">나에게 맞는 방식으로</p>
        <h1 id="start-title">풀이를 만들 AI를 선택하세요</h1>
        <p className="landing-start-description">시험지는 그대로, 이용 방식은 편한 쪽으로</p>
        <div className="landing-start-options">
          <Link className="landing-start-option" to="/new?mode=mcp">
            <span className="landing-start-icon" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M12 20l8-8M11 15l-2 2a5 5 0 007 7l3-3M21 17l2-2a5 5 0 00-7-7l-3 3" /></svg></span>
            <span className="landing-start-tag">내 AI 활용</span>
            <h2>개인 AI 연결 <small>MCP</small></h2>
            <p>내가 쓰는 AI 프로그램을 연결해<br />시험지의 풀이를 만드세요</p>
            <ul><li>MCP를 지원하는 AI 프로그램에서 이용</li><li>개인 AI 계정의 사용량과 한도 적용</li><li>연결 방법은 작업 화면에서 안내</li></ul>
            <span className="landing-start-action">개인 AI로 시작하기 <span aria-hidden="true">→</span></span>
          </Link>
          <Link id="service-ai" className="landing-start-option landing-start-service" to="/new?mode=api">
            <span className="landing-start-icon" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M16 4l3.5 8.5L28 16l-8.5 3.5L16 28l-3.5-8.5L4 16l8.5-3.5Z" /></svg></span>
            <span className="landing-start-tag">간편하게 이용</span>
            <h2>풀이담 AI 사용</h2>
            <p>별도의 AI 연결 없이<br />풀이담에서 바로 시작하세요</p>
            <ul><li>시험지 업로드부터 해설지까지 한곳에서</li><li>개인 AI 구독 없이 이용하는 방식</li><li>현재 AI 실행 기능은 준비 중</li></ul>
            <span className="landing-start-action">풀이담 AI로 시작하기 <span aria-hidden="true">→</span></span>
          </Link>
        </div>
      </section>
    </main>
  )
}
