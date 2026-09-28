import { Link, Route, Routes } from 'react-router-dom'
import { JobListPage } from './features/jobs/JobListPage'
import { UploadPage } from './features/upload/UploadPage'
import { JobDetailPage } from './features/result/JobDetailPage'

// 화면 세 개: 목록, 새 작업, 작업 상세. 위 헤더에서 언제든 목록(메인)과 새 작업으로 간다
export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="app-title">수학은 돈이된다</Link>
          <nav>
            <Link to="/">작업 목록</Link>
            <Link to="/new">새 작업</Link>
          </nav>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<JobListPage />} />
        <Route path="/new" element={<UploadPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />
      </Routes>
    </div>
  )
}
