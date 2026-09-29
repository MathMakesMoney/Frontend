import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { JobListPage } from './features/jobs/JobListPage'
import { UploadPage } from './features/upload/UploadPage'
import { JobDetailPage } from './features/result/JobDetailPage'
import { HaesolViewerPage } from './features/result/viewer/HaesolViewerPage'

// 화면 네 개: 목록, 새 작업, 작업 상세, 해설지 보기(3칸). 위 헤더에서 언제든 목록(메인)과 새 작업으로 간다
export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="brand" aria-label="수학은 돈이된다 처음 화면">
            <span className="brand-mark" aria-hidden>
              해
            </span>
            <span className="brand-name">수학은 돈이된다</span>
          </Link>
          <nav className="app-nav">
            <NavLink to="/" end>
              작업 목록
            </NavLink>
            <Link to="/new" className="button">
              새 시험지 올리기
            </Link>
          </nav>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<JobListPage />} />
        <Route path="/new" element={<UploadPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />
        <Route path="/jobs/:id/haesol" element={<HaesolViewerPage />} />
      </Routes>
    </div>
  )
}
