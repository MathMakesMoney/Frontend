import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchJobs } from '../../shared/api'
import { stageText } from '../../shared/stage'

// 작업 목록 화면
export function JobListPage() {
  const { data: jobs, isLoading, error } = useQuery({ queryKey: ['jobs'], queryFn: fetchJobs })

  return (
    <div className="page">
      <div className="page-header">
        <h1>작업 목록</h1>
        <Link to="/new" className="button">
          새 작업
        </Link>
      </div>

      {isLoading && <p>불러오는 중...</p>}
      {error && <p className="error">목록을 불러오지 못했습니다</p>}

      {jobs && jobs.length === 0 && <p>아직 작업이 없습니다</p>}

      {jobs && jobs.length > 0 && (
        <table className="job-table">
          <thead>
            <tr>
              <th>제목</th>
              <th>형식</th>
              <th>단계</th>
              <th>검토 필요</th>
              <th>만든 날짜</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>
                  <Link to={`/jobs/${job.id}`}>{job.title}</Link>
                </td>
                <td>{job.inputType}</td>
                <td>{stageText(job.stage, job.solvedCount, job.problemCount)}</td>
                <td className={job.reviewCount > 0 ? 'review-count' : undefined}>
                  {job.reviewCount}
                </td>
                <td>{new Date(job.createdAt).toLocaleString('ko-KR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
