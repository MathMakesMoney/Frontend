import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { deleteJob, fetchJobs, type Job } from '../../shared/api'
import { featureText, jobPhase, stageText } from '../../shared/stage'
import { ProgressStatus } from '../../shared/ProgressStatus'
import { HangulCover } from '../../shared/HangulCover'

// 진행 상태 점 색: 완료 초록, 문항·풀이 저장 중 파랑, 업로드만 된 것 회색
function statusClass(job: Job): string {
  const phase = jobPhase(job)
  return phase === 'done' ? 'job-status done' : phase === 'uploaded' ? 'job-status' : 'job-status working'
}

// 묶음으로 올린 작업은 묶음 번호로 모으고(시험지 순서대로), 나머지는 낱개로 둔다. 묶음 순서는 목록에서 처음 나온 순
export function groupBatches(jobs: Job[]): { batches: { id: string; name: string; jobs: Job[] }[]; singles: Job[] } {
  const batches = new Map<string, { id: string; name: string; jobs: Job[] }>()
  const singles: Job[] = []
  for (const job of jobs) {
    if (!job.batch) { singles.push(job); continue }
    const group = batches.get(job.batch.id) ?? { id: job.batch.id, name: job.batch.name, jobs: [] }
    group.jobs.push(job)
    batches.set(job.batch.id, group)
  }
  const list = [...batches.values()]
  list.forEach(group => group.jobs.sort((a, b) => a.batch!.order - b.batch!.order))
  return { batches: list, singles }
}

// 검색과 진행 상태를 적용한 뒤 날짜순으로 정렬한다
export function visibleJobs(jobs: Job[], query: string, status: string, order: string): Job[] {
  const search = query.trim().toLocaleLowerCase()
  return jobs.filter(job =>
    [job.title, job.school, job.scope].join(' ').toLocaleLowerCase().includes(search)
    && (status === 'all' || jobPhase(job) === status),
  ).sort((a, b) => (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * (order === 'oldest' ? 1 : -1))
}

// 올린 시험지와 진행 상태를 작업 목록에서 확인한다
export function JobListPage() {
  const { data: jobs, isLoading, error } = useQuery({ queryKey: ['jobs'], queryFn: fetchJobs })
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [order, setOrder] = useState('latest')
  const filteredJobs = visibleJobs(jobs ?? [], query, status, order)
  const queryClient = useQueryClient()
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const deleteDialog = useRef<HTMLDialogElement>(null)
  const deletion = useMutation({ mutationFn: deleteJob, onSuccess: () => {
    deleteDialog.current?.close()
    return queryClient.invalidateQueries({ queryKey: ['jobs'] })
  } })
  const overview = query.trim() === '' && status === 'all' && order === 'latest'
  const { batches, singles } = groupBatches(filteredJobs)
  const recent = overview ? singles[0] : undefined
  const groups = [
    { status: 'working', title: '이어갈 작업', description: '풀이가 만들어지는 시험지' },
    { status: 'uploaded', title: '올려둔 시험지', description: '수업 준비를 시작해 보세요' },
    { status: 'done', title: '완성된 해설지', description: '다시 꺼내 쓰는 수업 자료' },
  ]

  // 삭제 버튼은 작업 링크 밖에 두고 확인 후 기존 API로 삭제한다
  function jobCard(job: Job, featured = false) {
    const cover = (<div className="job-cover-sheet">
              <span className="job-cover-details">{job.school || '시험지'}{job.grade ? ` · ${job.grade.endsWith('학년') ? job.grade : `${job.grade}학년`}` : ''}</span>
              <strong>{job.title}</strong>
              <span className="job-cover-rule" />
              <span className="job-cover-subject">{job.scope || '수학 시험지'}</span>
              <span className="job-cover-count">{job.problemCount > 0 ? `${job.problemCount}문항` : '시험지 업로드'}</span>
              <span className="job-cover-brand">풀이담</span>
            </div>)
    return (
      <li key={job.id} data-status={jobPhase(job)} className={`job-card${featured ? ' job-card-featured' : ''}`}>
        <Link to={`/jobs/${job.id}`} className="job-row">
          <div className="job-cover" aria-hidden="true">
            {job.inputType !== 'HWP' && job.inputType !== 'HWPX' ? cover : <HangulCover jobId={job.id} inputType={job.inputType} title={job.title} className="job-cover-preview">{cover}</HangulCover>}
            {job.inputType === 'PDF' && <img className="job-cover-preview" src={`/api/jobs/${encodeURIComponent(job.id)}/pages/1.png`} alt="" loading="lazy" onError={event => { event.currentTarget.hidden = true }} />}
            <span className={`file-type${job.inputType === 'PDF' ? ' pdf' : ''}`}>{job.inputType}</span>
          </div>
          <div className="job-card-body">
            {featured && <span className="job-feature-label">최근 작업</span>}
            <span className="job-name">
              <span className="job-title">{job.title}</span>
              <span className="job-date">{new Date(job.createdAt).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })}</span>
            </span>
            <div className="job-card-status">
              {job.progress ? <ProgressStatus job={job} /> : <span className={statusClass(job)}>{stageText(job.stage, job.solvedCount, job.problemCount)}</span>}
              {job.features && <span className="job-features">{featureText(job.features)}</span>}
              {job.reviewCount > 0 && <span className="job-review">검토 필요 {job.reviewCount}</span>}
              <span className="job-chevron" aria-hidden="true">↗</span>
            </div>
            {featured && <span className="job-feature-action">{job.stage === 'done' ? '해설지 다시 보기' : '이어서 보기'} <span aria-hidden="true">→</span></span>}
          </div>
        </Link>
        <button type="button" className="job-delete" aria-label={`${job.title} 삭제`} disabled={deletion.isPending} onClick={() => {
          setSelectedJob(job)
          deletion.reset()
          deleteDialog.current?.showModal()
        }}>삭제</button>
      </li>
    )
  }

  return (
    <div className="home jobs-page">
      {!overview && <button type="button" className="jobs-back" aria-label="전체 작업으로 돌아가기" onClick={() => { setQuery(''); setStatus('all'); setOrder('latest') }}><span aria-hidden="true">←</span></button>}
      <div className="jobs-heading">
        <div>
          <p className="jobs-eyebrow">수업 준비를 한곳에서</p>
          <h1>내 작업 {jobs && jobs.length > 0 && <span>{jobs.length}</span>}</h1>
          <p>올린 시험지의 진행 상태와 해설지를 확인하세요</p>
        </div>
      </div>

      {jobs && jobs.length > 0 && (
        <div className="jobs-toolbar">
          <input type="search" aria-label="작업 검색" placeholder="시험지 제목, 학교, 교과 검색" value={query} onChange={event => setQuery(event.target.value)} />
          <select aria-label="진행 상태" value={status} onChange={event => setStatus(event.target.value)}>
            <option value="all">전체 상태</option>
            <option value="uploaded">업로드</option>
            <option value="working">진행 중</option>
            <option value="done">완료</option>
          </select>
          {!overview && <button type="button" className="jobs-reset" onClick={() => { setQuery(''); setStatus('all'); setOrder('latest') }}>전체 작업 보기</button>}
          <select aria-label="작업 정렬" value={order} onChange={event => setOrder(event.target.value)}>
            <option value="latest">최신순</option>
            <option value="oldest">오래된순</option>
          </select>
          <Link to="/start" className="button jobs-upload">새 시험지 올리기 <span aria-hidden="true">＋</span></Link>
        </div>
      )}

      {jobs && jobs.length > 0 && filteredJobs.length === 0 && <p className="jobs-notice" role="status">조건에 맞는 작업이 없어요 · 검색어나 진행 상태를 바꿔보세요</p>}
      {isLoading && <p className="jobs-notice" role="status">작업을 불러오는 중이에요</p>}
      {error && <p className="error jobs-notice" role="alert">목록을 불러오지 못했어요 · 잠시 후 다시 시도해 주세요</p>}

      {jobs && jobs.length === 0 && (
        <div className="home-empty">
          <span className="jobs-empty-icon" aria-hidden="true">＋</span>
          <h2>첫 시험지를 올려볼까요</h2>
          <p>시험지를 올리면 진행 상태와 해설지를 여기서 볼 수 있어요</p>
          <Link to="/start" className="button">
            새 시험지 올리기
          </Link>
        </div>
      )}


      {recent && (
        <div className="jobs-workspace">
          <ul className="jobs-recent">{jobCard(recent, true)}</ul>
          <div className="jobs-overview">
            <p>나의 수업 자료</p>
            <h2>차곡차곡 쌓이는<br />수업 준비</h2>
            <div className="jobs-counts">
              {groups.map(group => <button key={group.status} data-status={group.status} type="button" onClick={() => setStatus(group.status)}>
                <span>{group.status === 'working' ? '진행 중' : group.status === 'uploaded' ? '업로드' : '완료'}</span>
                <strong>{visibleJobs(jobs ?? [], '', group.status, 'latest').length}</strong>
              </button>)}
            </div>
          </div>
        </div>
      )}
      {batches.map(batch => <section className="jobs-section jobs-batch" key={batch.id}>
        <div className="jobs-section-heading">
          <h2>{batch.name} <span>{batch.jobs.length}</span></h2>
          <Link to={`/batches/${batch.id}`} className="jobs-batch-link">묶음 화면 <span aria-hidden="true">→</span></Link>
        </div>
        <ul className="job-list">{batch.jobs.map(job => jobCard(job))}</ul>
      </section>)}
      {overview ? groups.map(group => {
        const grouped = visibleJobs(singles, '', group.status, order).filter(job => job.id !== recent?.id)
        return grouped.length > 0 && <section className="jobs-section" key={group.status}>
          <div className="jobs-section-heading"><h2>{group.title} <span>{grouped.length}</span></h2><p>{group.description}</p></div>
          <ul className="job-list">{grouped.map(job => jobCard(job))}</ul>
        </section>
      }) : singles.length > 0 && <ul className="job-list">{singles.map(job => jobCard(job))}</ul>}
      <dialog ref={deleteDialog} className="jobs-delete-dialog" aria-labelledby="jobs-delete-title" onClose={() => setSelectedJob(null)}>
        <span className="jobs-delete-icon" aria-hidden="true">×</span>
        <h2 id="jobs-delete-title">이 작업을 삭제할까요</h2>
        <p className="jobs-delete-name">{selectedJob?.title}</p>
        <p>시험지와 해설지 파일도 함께 삭제됩니다<br />삭제한 작업은 되돌릴 수 없어요</p>
        {deletion.isError && <p className="error" role="alert">삭제하지 못했어요 · 다시 시도해 주세요</p>}
        <div className="jobs-delete-actions">
          <button type="button" onClick={() => deleteDialog.current?.close()}>취소</button>
          <button type="button" disabled={deletion.isPending || !selectedJob} onClick={() => { if (selectedJob) deletion.mutate(selectedJob.id) }}>{deletion.isPending ? '삭제 중' : '삭제하기'}</button>
        </div>
      </dialog>
    </div>
  )
}
