import { Route, Routes } from 'react-router-dom'
import { JobListPage } from './features/jobs/JobListPage'
import { UploadPage } from './features/upload/UploadPage'
import { JobDetailPage } from './features/result/JobDetailPage'

// 화면 세 개: 목록, 새 작업, 작업 상세
export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<JobListPage />} />
        <Route path="/new" element={<UploadPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />
      </Routes>
    </div>
  )
}
