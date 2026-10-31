import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { login, signup } from './shared/api'
import { useMe } from './shared/useMe'

export function LandingLogin() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const { me } = useMe()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // 이미 로그인했으면 작업 목록으로
  if (me) return <Navigate to="/jobs" replace />

  // 가입(가입 뒤 바로 로그인)이나 로그인을 보내고, 서버 오류 문장은 그대로 보여 준다
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email'))
    const password = String(form.get('password'))
    setBusy(true)
    setMessage('')
    try {
      if (mode === 'signup') await signup({ email, password, name: String(form.get('name')) })
      queryClient.setQueryData(['me'], await login(email, password))
      navigate('/jobs')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '요청에 실패했습니다')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="landing-login">
      <header className="landing-login-header">
        <Link to="/" className="landing-login-exit" aria-label="처음 화면으로 돌아가기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5l-7 7 7 7M7 12h14" /></svg></Link>
        <Link to="/" className="landing-login-brand"><img className="header-bear-icon" src="/favicon.svg" width="32" height="32" alt="" />풀이담</Link>
        <Link to="/jobs" className="landing-header-jobs">작업 목록</Link>
      </header>
      <section className="landing-login-card" aria-labelledby="login-title">
        <p className="landing-eyebrow">수업 준비를 담다</p>
        <h1 id="login-title">{mode === 'login' ? <>반가워요<br />풀이담에 로그인하세요</> : <>처음이시군요<br />풀이담에 가입하세요</>}</h1>
        <form onSubmit={submit}>
          {mode === 'signup' && <label>이름<input name="name" autoComplete="name" required /></label>}
          <label>이메일<input name="email" type="email" autoComplete="email" required /></label>
          <label>비밀번호<input name="password" type="password" minLength={mode === 'signup' ? 8 : undefined} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /></label>
          {mode === 'signup' && <p className="landing-login-description">비밀번호는 8자 이상</p>}
          <button type="submit" disabled={busy}>{mode === 'login' ? '로그인' : '가입하고 시작하기'}</button>
        </form>
        <p className="landing-login-message" role="status">{message}</p>
        <button type="button" className="landing-login-switch" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }}>
          {mode === 'login' ? '처음이신가요? 가입하기' : '이미 계정이 있나요? 로그인'}
        </button>
        <div className="landing-social-buttons">
          <button type="button" className="landing-social-kakao" disabled>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C5.9 3 1 6.6 1 11c0 2.8 2 5.3 5 6.7L5 22l4.7-3.1c.8.1 1.5.2 2.3.2 6.1 0 11-3.6 11-8.1S18.1 3 12 3Z" /></svg>
            카카오로 시작하기 (준비 중)
          </button>
          <button type="button" className="landing-social-google" disabled>
            <span aria-hidden="true">G</span>Google로 시작하기 (준비 중)
          </button>
        </div>
      </section>
    </main>
  )
}
