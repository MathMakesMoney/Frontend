import { useEffect } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { JobListPage } from './features/jobs/JobListPage'
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
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LandingLogin />} />
      <Route path="/start" element={<LandingStart />} />
      <Route path="/subscribe" element={<SubscriptionPage />} />
      <Route path="*" element={<div className="app">
      <header className="app-header">
        <div className="landing-header">
          <Link to="/" className="landing-logo" aria-label="풀이담 처음 화면"><img className="header-bear-icon" src="/favicon.svg" width="32" height="32" alt="" />풀이담<span>수업 준비를 담다</span></Link>
          <nav className="app-nav" aria-label="작업 메뉴">
            <NavLink to="/jobs" end>작업 목록</NavLink>
            <Link to="/subscribe">구독하기</Link>
            <Link to="/login">로그인</Link>
            <Link to="/start" className="landing-nav-button">시험지 올리기</Link>
          </nav>
        </div>
      </header>
      <Routes>
        <Route path="/jobs" element={<JobListPage />} />
        <Route path="/new" element={<UploadPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />
        <Route path="/jobs/:id/haesol" element={<HaesolViewerPage />} />
        <Route path="/jobs/:id/variant" element={<HaesolViewerPage variant />} />
      </Routes>
    </div>} />
    </Routes>
  )
}
