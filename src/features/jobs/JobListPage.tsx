import { type MouseEvent, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { academyPartsUrl, deleteJob, fetchJobs, type DocPart, type Job } from '../../shared/api'
import { featureText, jobPhase, stageText } from '../../shared/stage'
import { ProgressStatus } from '../../shared/ProgressStatus'
import { HangulCover } from '../../shared/HangulCover'

const PARTS: { key: DocPart; label: string }[] = [
  { key: 'munje', label: '문제지' }, { key: 'dap', label: '빠른정답' }, { key: 'haesol', label: '해설지' },
]

// 작업에서 받을 수 있는 분류 (서버가 결과 문서가 있을 때만 parts 를 준다)
export function jobParts(job: Pick<Job, 'files'>): DocPart[] {
  return job.files.parts ?? []
}

// 고른 작업 모두에 있는 분류만 받을 수 있다
export function commonParts(jobs: Pick<Job, 'files'>[]): DocPart[] {
  return PARTS.map(part => part.key).filter(key => jobs.every(job => jobParts(job).includes(key)))
}

// 진행 상태 점 색: 완료 초록, 문항·풀이 저장 중 파랑, 업로드만 된 것 회색
function statusClass(job: Job): string {
  const phase = jobPhase(job)
  return phase === 'done' ? 'job-status done' : phase === 'uploaded' ? 'job-status' : 'job-status working'
}

// 묶음으로 올린 작업은 묶음 번호로 모으고(시험지 순서대로), 나머지는 낱개로 둔다. 묶음 순서는 목록에서 처음 나온 순
// 끝난 작업의 링크 글: 해설을 안 고른 작업(타이핑만 등)은 해설지가 없으니 결과물 보기
export const doneLinkText = (job: Pick<Job, 'features'>) =>
  job.features && !job.features.includes('haesol') ? '결과물 보기' : '해설지 다시 보기'

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
  const [selecting, setSelecting] = useState(false)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [picked, setPicked] = useState<DocPart[]>([])
  const downloadDialog = useRef<HTMLDialogElement>(null)
  const selectedJobs = (jobs ?? []).filter(job => checked.has(job.id))
  const available = commonParts(selectedJobs)
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

  // 고른 작업마다 임시 링크를 눌러 내려받고 창과 선택을 닫는다
  function download() {
    for (const job of selectedJobs) {
      const link = document.createElement('a')
      link.href = academyPartsUrl(job.id, picked)
      link.download = ''
      link.click()
    }
    downloadDialog.current?.close()
    stopSelecting()
  }

  // 선택 모드를 끄면 고른 작업도 비운다
  function stopSelecting() {
    setSelecting(false)
    setChecked(new Set())
  }

  // 선택 모드에서 카드를 누르면 이동하지 않고 고르거나 푼다 (결과 문서가 있는 작업만)
  function toggle(event: MouseEvent, job: Job) {
    event.preventDefault()
    if (jobParts(job).length === 0) return
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(job.id)) next.delete(job.id); else next.add(job.id)
      return next
    })
  }

  // 삭제 버튼은 작업 링크 밖에 두고 확인 후 기존 API로 삭제한다
  function jobCard(job: Job, featured = false) {
    // 학원 작업은 보류 문항 수(보류일 때만, 결정하면 줄어든다), 그 밖은 검토 필요 수
    const reviews = job.progress ? (job.progress === 'hold' ? job.holdCount ?? 0 : 0) : job.reviewCount
    const cover = (<div className="job-cover-sheet">
              <span className="job-cover-details">{job.school || '시험지'}{job.grade ? ` · ${job.grade.endsWith('학년') ? job.grade : `${job.grade}학년`}` : ''}</span>
              <strong>{job.title}</strong>
              <span className="job-cover-rule" />
              <span className="job-cover-subject">{job.scope || '수학 시험지'}</span>
              <span className="job-cover-count">{job.problemCount > 0 ? `${job.problemCount}문항` : '시험지 업로드'}</span>
              <span className="job-cover-brand">풀이담</span>
            </div>)
    return (
      <li key={job.id} data-status={jobPhase(job)} className={`job-card${featured ? ' job-card-featured' : ''}${checked.has(job.id) ? ' is-selected' : ''}${selecting && jobParts(job).length === 0 ? ' is-unselectable' : ''}`}>
        <Link to={`/jobs/${job.id}`} className="job-row"
          {...(selecting && { role: 'button', 'aria-pressed': checked.has(job.id), 'aria-disabled': jobParts(job).length === 0, title: jobParts(job).length === 0 ? '결과 문서가 아직 없습니다' : undefined, onClick: (event: MouseEvent) => toggle(event, job) })}>
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
              {reviews > 0 && <span className="job-review">검토 필요 {reviews}</span>}
              <span className="job-chevron" aria-hidden="true">↗</span>
            </div>
            {featured && <span className="job-feature-action">{job.stage === 'done' ? doneLinkText(job) : '이어서 보기'} <span aria-hidden="true">→</span></span>}
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
          <button type="button" className={`jobs-select-mode${selecting ? ' active' : ''}`} aria-pressed={selecting} onClick={() => selecting ? stopSelecting() : setSelecting(true)}>{selecting ? '선택 취소' : '선택'}</button>
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
      {selectedJobs.length > 0 && (
        <div className="jobs-selection-bar" role="region" aria-label="선택한 학습지">
          <span>학습지 {selectedJobs.length}개 선택됨</span>
          <button type="button" className="jobs-selection-download" onClick={() => { setPicked(available); downloadDialog.current?.showModal() }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 2v8M4.5 7 8 10.5 11.5 7M2.5 13h11" /></svg>
            다운로드
          </button>
          <button type="button" className="jobs-selection-clear" aria-label="선택 해제" onClick={stopSelecting}>×</button>
        </div>
      )}
      <dialog ref={downloadDialog} className="jobs-download-dialog" aria-labelledby="jobs-download-title"
        onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close() }}>
        <div className="jobs-download-head">
          <div>
            <h2 id="jobs-download-title">학습지 다운로드</h2>
            <p>{selectedJobs.length === 1 ? selectedJobs[0].title : `${selectedJobs.length}개`}</p>
          </div>
          <button type="button" aria-label="닫기" onClick={() => downloadDialog.current?.close()}>×</button>
        </div>
        <div className="jobs-download-parts" role="group" aria-label="분류 선택">
          <span>분류 선택</span>
          {PARTS.map(part => <button key={part.key} type="button" aria-pressed={picked.includes(part.key)} disabled={!available.includes(part.key)}
            onClick={() => setPicked(prev => prev.includes(part.key) ? prev.filter(key => key !== part.key) : [...prev, part.key])}>{part.label}</button>)}
        </div>
        <button type="button" className="jobs-download-submit" disabled={picked.length === 0} onClick={download}>다운로드</button>
      </dialog>
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
