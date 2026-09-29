import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchJobs, type Job } from '../../shared/api'
import { stageText } from '../../shared/stage'

// 진행 상태 점 색: 완료 초록, 문항·풀이 저장 중 파랑, 업로드만 된 것 회색
function statusClass(job: Job): string {
  if (job.stage === 'done') return 'job-status done'
  if (job.stage === 'uploaded') return 'job-status'
  return 'job-status working'
}

// 처음 화면: 한 줄 소개와 만드는 순서, 그 아래 작업 목록
export function JobListPage() {
  const { data: jobs, isLoading, error } = useQuery({ queryKey: ['jobs'], queryFn: fetchJobs })

  return (
    <div className="home">
      <section className="home-intro">
        <div>
          <h1>시험지를 올리면 한글 해설지로 만들어 드립니다</h1>
          <p>
            HWP, HWPX, PDF 시험지의 문항을 풀고 따로 한 번 더 검증합니다. 검증을 통과하지 못한 문항은 검토 필요로
            표시해 두니, 확인만 하고 한글 수식이 들어간 해설지를 받으세요.
          </p>
          <ol className="home-steps">
            <li>
              <b>1</b>시험지 올리기
            </li>
            <li>
              <b>2</b>풀이와 검증
            </li>
            <li>
              <b>3</b>해설지 받기
            </li>
          </ol>
        </div>
        <Link to="/new" className="button home-cta">
          새 시험지 올리기
        </Link>
      </section>

      <div className="home-list-head">
        <h2>내 작업</h2>
        {jobs && jobs.length > 0 && <span>{jobs.length}개</span>}
      </div>

      {isLoading && <p className="job-meta">불러오는 중...</p>}
      {error && <p className="error">목록을 불러오지 못했습니다. 서버가 켜져 있는지 확인해 주세요.</p>}

      {jobs && jobs.length === 0 && (
        <div className="home-empty">
          <p>아직 작업이 없습니다. 시험지를 올리면 여기에 작업이 생깁니다.</p>
          <Link to="/new" className="button">
            새 시험지 올리기
          </Link>
        </div>
      )}

      {jobs && jobs.length > 0 && (
        <ul className="job-list">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link to={`/jobs/${job.id}`} className="job-row">
                <span className={`file-type${job.inputType === 'PDF' ? ' pdf' : ''}`}>{job.inputType}</span>
                <span className="job-name">
                  <span className="job-title">{job.title}</span>
                  <span className="job-date">
                    {new Date(job.createdAt).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </span>
                <span className={statusClass(job)}>{stageText(job.stage, job.solvedCount, job.problemCount)}</span>
                <span className="job-review">{job.reviewCount > 0 ? `검토 필요 ${job.reviewCount}` : ''}</span>
                <span className="job-chevron" aria-hidden>
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
