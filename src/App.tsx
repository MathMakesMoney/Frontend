import { useEffect } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { logout, UNAUTHORIZED_EVENT } from './shared/api'
import { useMe } from './shared/useMe'
import { JobListPage } from './features/jobs/JobListPage'
import { BatchPage } from './features/jobs/BatchPage'
import { UploadPage } from './features/upload/UploadPage'
import { JobDetailPage } from './features/result/JobDetailPage'
import { HaesolViewerPage } from './features/result/viewer/HaesolViewerPage'
import { LandingPage } from './LandingPage'
import { LandingLogin } from './LandingLogin'
import { LandingStart } from './LandingStart'
import { SubscriptionPage } from './SubscriptionPlans'

// 랜딩과 작업 화면: 최신 해설지 보기와 기존 작업 흐름을 함께 제공한다
export default function App() {
  const { pathname } = useLocation()
  // 다른 페이지로 이동하면 이전 화면의 스크롤 위치를 지운다
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])
  const { me, isLoading } = useMe()
  const queryClient = useQueryClient()
  // API 가 401 을 주면 로그아웃 상태로 돌린다 (아래에서 로그인 화면으로 보낸다)
  useEffect(() => {
    const onExpired = () => queryClient.setQueryData(['me'], null)
    window.addEventListener(UNAUTHORIZED_EVENT, onExpired)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onExpired)
  }, [queryClient])
  // 로그아웃: 서버 세션을 끊고 로그인 화면으로
  async function signOut() {
    await logout()
    queryClient.clear()
    queryClient.setQueryData(['me'], null)
  }
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LandingLogin />} />
      <Route path="/start" element={<LandingStart />} />
      <Route path="/subscribe" element={<SubscriptionPage />} />
      <Route path="*" element={isLoading ? null : !me ? <Navigate to="/login" replace /> : <div className="app">
      <header className="app-header">
        <div className="landing-header">
          <Link to="/" className="landing-logo" aria-label="풀이담 처음 화면"><img className="header-bear-icon" src="/favicon.svg" width="32" height="32" alt="" />풀이담<span>수업 준비를 담다</span></Link>
          <nav className="app-nav" aria-label="작업 메뉴">
            <NavLink to="/jobs" end>작업 목록</NavLink>
            <Link to="/subscribe">구독하기</Link>
            <button type="button" className="app-logout" onClick={signOut}>{me?.name} 로그아웃</button>
            <Link to="/start" className="landing-nav-button">시험지 올리기</Link>
          </nav>
        </div>
      </header>
      <Routes>
        <Route path="/jobs" element={<JobListPage />} />
        <Route path="/new" element={<UploadPage />} />
        <Route path="/batches/:id" element={<BatchPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />
        <Route path="/jobs/:id/haesol" element={<HaesolViewerPage />} />
        <Route path="/jobs/:id/variant" element={<HaesolViewerPage variant />} />
      </Routes>
    </div>} />
    </Routes>
  )
}
