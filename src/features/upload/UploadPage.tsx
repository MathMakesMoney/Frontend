import { FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { createBatch, createJob, type BatchCreated, type Feature } from '../../shared/api'
import { isValidPagesRange } from '../../shared/pagesRange'
import { FEATURE_LABEL } from '../../shared/stage'
import { applyCommon, EMPTY_COMMON, newRow, pickFiles, toggleFeature, type Common, type Row } from './batchFiles'
import { fileTitle } from './fileTitle'
import { keptIndexes, sameExamGroups } from './sameExam'

export const ACCEPTED = ['.pdf', '.hwp', '.hwpx', '.hml']

function isPdf(file: File): boolean {
  return file.name.toLowerCase().endsWith('.pdf')
}

function isHml(file: File | null): boolean {
  return !!file && file.name.toLowerCase().endsWith('.hml')
}

// 기능 체크 (타이핑·해설·변형): 변형을 켜면 해설이 같이 켜진다
function FeaturePicker({ features, onChange, disabled }: { features: Feature[]; onChange: (next: Feature[]) => void; disabled?: boolean }) {
  return (
    <div className="upload-features" role="group" aria-label="만들 기능">
      {(['typing', 'haesol', 'variant'] as const).map(feature => (
        <label key={feature} className="upload-feature">
          <input type="checkbox" checked={features.includes(feature)} disabled={disabled || (feature === 'haesol' && features.includes('variant'))}
            onChange={e => onChange(toggleFeature(features, feature, e.target.checked))} />
          {FEATURE_LABEL[feature]}
        </label>
      ))}
    </div>
  )
}

// 묶음 시험지 하나만의 칸: PDF 는 쪽 범위, hml 이 아니면 시험 범위 (단일 업로드와 같은 칸)
function FileFields({ file, row, onChange }: { file: File; row: Row; onChange: (next: Row) => void }) {
  const pagesError = row.pages.trim() !== '' && !isValidPagesRange(row.pages)
  return <>
    {isPdf(file) && <label>쪽 범위 (선택)<input type="text" value={row.pages} onChange={e => onChange({ ...row, pages: e.target.value })} placeholder="예: 1-8,13-16" />
      {pagesError && <span className="error">형식이 올바르지 않습니다</span>}</label>}
    {!isHml(file) && <label>시험 범위 (선택)<input type="text" value={row.range} onChange={e => onChange({ ...row, range: e.target.value })} placeholder="예: 수학(하) 집합~함수" /></label>}
  </>
}

// 묶음 한 칸(공통 값 또는 시험지 하나)의 입력 칸들
function ExamFields({ value, onChange }: { value: Common; onChange: (next: Common) => void }) {
  const set = (key: 'scope' | 'school' | 'grade' | 'exam') => (e: { target: { value: string } }) => onChange({ ...value, [key]: e.target.value })
  return <>
    <label>교과 범위<input type="text" value={value.scope} onChange={set('scope')} list="upload-subjects" placeholder="예: 확률과 통계" /></label>
    <label>학교 (선택)<input type="text" value={value.school} onChange={set('school')} placeholder="예: 한국고" /></label>
    <label>학년 (선택)<input type="text" value={value.grade} onChange={set('grade')} placeholder="예: 1" /></label>
    <label>시험 이름 (선택)<input type="text" value={value.exam} onChange={set('exam')} placeholder="예: 2023학년도 2학기 중간고사" /></label>
    <FeaturePicker features={value.features} onChange={features => onChange({ ...value, features })} />
  </>
}

// 작업 만들기(업로드) 화면
export function UploadPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const apiMode = searchParams.get('mode') === 'api'
  const [files, setFiles] = useState<File[]>([])
  const [skipped, setSkipped] = useState<string[]>([])
  const [choice, setChoice] = useState<Record<number, number>>({})  // 같은 시험지 묶음 첫 번호 -> 고른 파일 번호
  const [batchName, setBatchName] = useState('')
  const [common, setCommon] = useState<Common>(EMPTY_COMMON)
  const [rows, setRows] = useState<Row[]>([])
  const [features, setFeatures] = useState<Feature[]>(['typing'])
  const [created, setCreated] = useState<BatchCreated | null>(null)
  const [title, setTitle] = useState('')
  const [scope, setScope] = useState('')
  const [pages, setPages] = useState('')
  const [school, setSchool] = useState('')
  const [grade, setGrade] = useState('')
  const [exam, setExam] = useState('')
  const [range, setRange] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const file = files[0] ?? null
  const batch = files.length >= 2  // 지원 파일 2개 이상은 묶음
  // 같은 시험지가 다른 형식으로 같이 올라오면 하나만 고르게 한다 (고르기 전에는 올리지 못한다)
  const groups = sameExamGroups(files)
  const kept = keptIndexes(files.length, groups, choice)
  const pending = groups.some(g => !(g[0] in choice))
  const hml = !batch && isHml(file)  // hml 은 AI 없이 문항을 읽는다
  // AI 를 쓰는지: hwp·hwpx·pdf 는 문항 뽑기부터 AI, hml 은 해설·변형만
  const wantsAi = batch ? rows.some((r, i) => kept.includes(i) && (!isHml(files[i]) || r.features.includes('haesol'))) : !hml || features.includes('haesol')
  const pagesError = pages.trim() !== '' && !isValidPagesRange(pages)

  // 고른 파일을 나눠 담는다: 묶음이면 시험지마다 입력 줄을 만든다
  function choose(picked: File[]) {
    const next = pickFiles(picked)
    if (next.files.length === 0 && next.skipped.length === 0) return
    if (next.files.length === 1) {
      setTitle(fileTitle(title, file?.name ?? '', next.files[0].name))
      // 기본 기능: hml 은 타이핑, hwp·hwpx·pdf 는 지금까지처럼 해설
      setFeatures(isHml(next.files[0]) ? ['typing'] : ['haesol'])
    }
    setFiles(next.files)
    setSkipped(next.skipped)
    setChoice({})
    setRows(next.files.length >= 2 ? next.files.map(newRow) : [])
    setError(null)
  }

  async function handleBatchSubmit() {
    if (pending) {
      setError('같은 시험지가 여러 형식으로 올라왔어요. 하나만 골라 주세요')
      return
    }
    // 화면에 남은(고른) 행만 검사한다
    const keptRows = kept.map(i => rows[i])
    if (keptRows.some(r => r.features.length === 0)) {
      setError('시험지마다 만들 기능을 하나 이상 고르세요')
      return
    }
    if (keptRows.some(r => r.pages.trim() !== '' && !isValidPagesRange(r.pages))) {
      setError('쪽 범위 형식이 올바르지 않습니다 (예: 1-8,13-16)')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const result = await createBatch(kept.map(i => files[i]), batchName.trim(), kept.map(i => ({ ...rows[i], pages: rows[i].pages.trim(), range: rows[i].range.trim() })))
      if (result.errors.length === 0) navigate(`/batches/${result.id}`)
      else setCreated(result)  // 거부된 시험지를 파일별로 보여 준 뒤 묶음 화면으로
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드에 실패했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (batch) return handleBatchSubmit()
    if (!file) {
      setError('파일을 선택하세요')
      return
    }
    if (pagesError) {
      setError('쪽 범위 형식이 올바르지 않습니다 (예: 1-8,13-16)')
      return
    }
    if (features.length === 0) {
      setError('만들 기능을 하나 이상 고르세요')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const { id } = await createJob({
        file,
        title,
        scope,
        pages: isPdf(file) && pages.trim() ? pages.trim() : undefined,
        school: school.trim(),
        grade: grade.trim(),
        exam: exam.trim(),
        range: range.trim(),
        features,
      })
      navigate(`/jobs/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드에 실패했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  if (created) {
    return (
      <div className="page upload-page">
        <h1>묶음을 만들었어요</h1>
        <p className="hint">시험지 {created.jobs.length}개를 올렸고 {created.errors.length}개는 올리지 못했어요</p>
        <ul className="upload-errors" role="alert">
          {created.errors.map(item => <li key={item.file}><strong>{item.file}</strong> {item.error}</li>)}
        </ul>
        <Link to={`/batches/${created.id}`} className="button">묶음 화면으로</Link>
      </div>
    )
  }

  return (
    <div className="page upload-page">
      <p className="upload-eyebrow">시험지에서 해설지로</p>
      <h1>새 시험지를 올려주세요</h1>
      <p className="hint">HWPX · HWP · PDF · HML을 지원해요 · 더 정확한 추출을 위해 HWPX를 권장해요 · 2개 이상 고르면 묶음으로 올라가요</p>

      {wantsAi && <div className="upload-mode" role="group" aria-label="AI 이용 방식">
        {(['mcp', 'api'] as const).map(mode => (
          <button type="button" key={mode} aria-pressed={apiMode === (mode === 'api')} disabled={submitting} onClick={() => {
            const next = new URLSearchParams(searchParams)
            next.set('mode', mode)
            setSearchParams(next, { replace: true })
          }}>
            <span className="upload-mode-light" aria-hidden="true" />
            {mode === 'mcp' ? '개인 AI 연결(MCP)' : '풀이담 AI'}
          </button>
        ))}
      </div>}
      {wantsAi && apiMode && <p className="hint">AI 실행 기능은 준비 중입니다</p>}

      <form onSubmit={handleSubmit} className="upload-form">
        <label className="upload-file-field">
          <span className="upload-file-icon" aria-hidden="true">↑</span>
          <strong>{batch ? `시험지 ${kept.length}개` : file ? file.name : '시험지 파일을 선택하세요'}</strong>
          <span className="hint">쓰던 시험지 그대로, 한 파일 또는 여러 개를 고르세요</span>
          <span className="upload-file-picker" aria-hidden="true">파일 선택</span>
          <input
            type="file"
            aria-label="시험지 파일"
            accept={ACCEPTED.join(',')}
            multiple
            onChange={(e) => choose(Array.from(e.target.files ?? []))}
          />
        </label>
        <label className="upload-folder-picker">
          폴더째 선택
          <input type="file" aria-label="시험지 폴더" {...({ webkitdirectory: '' } as object)} onChange={(e) => choose(Array.from(e.target.files ?? []))} />
        </label>
        {skipped.length > 0 && <p className="hint" role="status">묶음에 넣지 못한 파일 {skipped.length}개: {skipped.join(', ')}</p>}

        {groups.map(group => (
          <fieldset className="upload-details" key={group[0]}>
            <legend>같은 시험지 <span>하나만 골라 주세요</span></legend>
            <p className="hint">형식만 다른 같은 시험지로 보여요. 둘 다 올리면 AI 비용이 두 번 들어요</p>
            <div className="upload-features" role="radiogroup" aria-label="올릴 파일">
              {group.map(i => (
                <label key={i} className="upload-feature">
                  <input type="radio" name={`same-exam-${group[0]}`} checked={choice[group[0]] === i}
                    onChange={() => setChoice({ ...choice, [group[0]]: i })} />
                  {files[i].webkitRelativePath || files[i].name}
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        {batch && <>
          <label>
            묶음 이름 (선택)
            <input type="text" value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder="비우면 날짜로 정해져요" />
          </label>
          <fieldset className="upload-details upload-common">
            <legend>공통 값 <span>한 번에 채우기</span></legend>
            <ExamFields value={common} onChange={setCommon} />
            <button type="button" className="upload-apply" onClick={() => setRows(applyCommon(rows, common))}>모든 시험지에 적용</button>
          </fieldset>
          {rows.map((row, i) => kept.includes(i) && (
            <fieldset className="upload-details upload-row" key={files[i].name + i}>
              <legend>{files[i].name}</legend>
              <label>제목<input type="text" value={row.title} required onChange={(e) => setRows(rows.map((r, j) => j === i ? { ...r, title: e.target.value } : r))} /></label>
              <ExamFields value={row} onChange={(next) => setRows(rows.map((r, j) => j === i ? { ...r, ...next } : r))} />
              <FileFields file={files[i]} row={row} onChange={(next) => setRows(rows.map((r, j) => j === i ? next : r))} />
            </fieldset>
          ))}
        </>}

        {!batch && <label>
          제목
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>}

        {!batch && <label>
          교과 범위
          <input
            type="text"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            list="upload-subjects"
            placeholder="교과를 선택하거나 직접 입력하세요"
            required
          />
        </label>}

        <datalist id="upload-subjects">
          {['중등 수학', '공통수학 1', '공통수학 2', '수학 Ⅰ', '수학 Ⅱ', '미적분', '확률과 통계', '기하'].map((subject) => <option key={subject} value={subject} />)}
        </datalist>

        {/* 해설지 머리말에 들어갈 선택 정보를 모은다 */}
        {!batch && <fieldset className="upload-details">
        <legend>시험 정보 <span>선택</span></legend>
        {hml && <p className="hint">학원 양식 문서의 머리 표에 들어갑니다 (시험 이름은 연도·시험 칸, 교과 범위는 과목 칸). 학교를 비우면 시험지의 학교를 씁니다</p>}
        <label>
          학교 (선택)
          <input type="text" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="예: 한국고" />
        </label>
        <label>
          학년 (선택)
          <input type="text" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="예: 1" />
        </label>
        <label>
          시험 이름 (선택)
          <input
            type="text"
            value={exam}
            onChange={(e) => setExam(e.target.value)}
            placeholder="예: 2023학년도 2학기 중간고사"
          />
        </label>
        {!hml && <label>
          시험 범위 (선택)
          <input
            type="text"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            placeholder="예: 수학(하) 집합~함수"
          />
          <span className="hint">비우면 해설지에 임시 문구로 들어가고 한글에서 고칠 수 있습니다</span>
        </label>}
        <FeaturePicker features={features} onChange={setFeatures} />

        </fieldset>}

        {file && isPdf(file) && (
          <label>
            쪽 범위 (선택)
            <input
              type="text"
              value={pages}
              onChange={(e) => setPages(e.target.value)}
              placeholder="예: 1-8,13-16"
            />
            <span className="hint">
              여러 선택과목이 든 PDF 는 쪽 범위를 안 넣으면 번호가 밀릴 수 있어요
            </span>
            {pagesError && <span className="error">형식이 올바르지 않습니다</span>}
          </label>
        )}

        {error && <p className="error">{error}</p>}

        <button type="submit" className="button" disabled={submitting || pending}>
          {submitting ? '업로드 중...' : batch ? `묶음으로 올리기 (${kept.length}개)` : hml ? '학원 양식으로 만들기' : '만들기 시작'}
        </button>
      </form>
    </div>
  )
}
