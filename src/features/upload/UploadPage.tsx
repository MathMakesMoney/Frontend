import { FormEvent, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createJob } from '../../shared/api'
import { isValidPagesRange } from '../../shared/pagesRange'
import { fileTitle } from './fileTitle'

const ACCEPTED = ['.pdf', '.hwp', '.hwpx']

function isPdf(file: File): boolean {
  return file.name.toLowerCase().endsWith('.pdf')
}

// 작업 만들기(업로드) 화면
export function UploadPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const apiMode = searchParams.get('mode') === 'api'
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [scope, setScope] = useState('')
  const [pages, setPages] = useState('')
  const [school, setSchool] = useState('')
  const [grade, setGrade] = useState('')
  const [exam, setExam] = useState('')
  const [range, setRange] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const pagesError = pages.trim() !== '' && !isValidPagesRange(pages)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (!file) {
      setError('파일을 선택하세요')
      return
    }
    if (pagesError) {
      setError('쪽 범위 형식이 올바르지 않습니다 (예: 1-8,13-16)')
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
      })
      navigate(`/jobs/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드에 실패했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page upload-page">
      <p className="upload-eyebrow">시험지에서 해설지로</p>
      <h1>새 시험지를 올려주세요</h1>
      <p className="hint">HWPX · HWP · PDF를 지원해요 · 더 정확한 추출을 위해 HWPX를 권장해요</p>

      <div className="upload-mode" role="group" aria-label="AI 이용 방식">
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
      </div>
      {apiMode && <p className="hint">AI 실행 기능은 준비 중입니다</p>}

      <form onSubmit={handleSubmit} className="upload-form">
        <label className="upload-file-field">
          <span className="upload-file-icon" aria-hidden="true">↑</span>
          <strong>{file ? file.name : '시험지 파일을 선택하세요'}</strong>
          <span className="hint">쓰던 시험지 그대로, 한 파일로 시작하세요</span>
          <span className="upload-file-picker" aria-hidden="true">파일 선택</span>
          <input
            type="file"
            aria-label="시험지 파일"
            accept={ACCEPTED.join(',')}
            onChange={(e) => {
              const next = e.target.files?.[0] ?? null
              if (next) setTitle(fileTitle(title, file?.name ?? '', next.name))
              setFile(next)
            }}
          />
        </label>

        <label>
          제목
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>

        <label>
          교과 범위
          <input
            type="text"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            list="upload-subjects"
            placeholder="교과를 선택하거나 직접 입력하세요"
            required
          />
        </label>

        <datalist id="upload-subjects">
          {['중등 수학', '공통수학 1', '공통수학 2', '수학 Ⅰ', '수학 Ⅱ', '미적분', '확률과 통계', '기하'].map((subject) => <option key={subject} value={subject} />)}
        </datalist>

        {/* 해설지 머리말에 들어갈 선택 정보를 모은다 */}
        <fieldset className="upload-details">
        <legend>시험 정보 <span>선택</span></legend>
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
        <label>
          시험 범위 (선택)
          <input
            type="text"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            placeholder="예: 수학(하) 집합~함수"
          />
          <span className="hint">비우면 해설지에 임시 문구로 들어가고 한글에서 고칠 수 있습니다</span>
        </label>

        </fieldset>

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

        <button type="submit" className="button" disabled={submitting}>
          {submitting ? '업로드 중...' : '해설지 만들기 시작'}
        </button>
      </form>
    </div>
  )
}
