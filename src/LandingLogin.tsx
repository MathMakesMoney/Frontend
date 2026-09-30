import { useState } from 'react'
import { Link } from 'react-router-dom'

export function LandingLogin() {
  const [message, setMessage] = useState('')

  return (
    <main className="landing-login">
      <header className="landing-login-header">
        <Link to="/" className="landing-login-exit" aria-label="처음 화면으로 돌아가기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5l-7 7 7 7M7 12h14" /></svg></Link>
        <Link to="/" className="landing-login-brand"><img className="header-bear-icon" src="/favicon.svg" width="32" height="32" alt="" />풀이담</Link>
        <Link to="/jobs" className="landing-header-jobs">작업 목록</Link>
      </header>
      <section className="landing-login-card" aria-labelledby="login-title">
        <p className="landing-eyebrow">수업 준비를 담다</p>
        <h1 id="login-title">반가워요<br />풀이담에 로그인하세요</h1>
        <p className="landing-login-description">소셜 계정으로 간편하게 시작하세요</p>
        <div className="landing-social-buttons">
          <button type="button" className="landing-social-kakao" onClick={() => setMessage('카카오 로그인 연결을 준비하고 있습니다')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C5.9 3 1 6.6 1 11c0 2.8 2 5.3 5 6.7L5 22l4.7-3.1c.8.1 1.5.2 2.3.2 6.1 0 11-3.6 11-8.1S18.1 3 12 3Z" /></svg>
            카카오로 시작하기
          </button>
          <button type="button" className="landing-social-google" onClick={() => setMessage('Google 로그인 연결을 준비하고 있습니다')}>
            <span aria-hidden="true">G</span>Google로 시작하기
          </button>
        </div>
        <p className="landing-login-message" role="status">{message}</p>
      </section>
    </main>
  )
}
