import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createJob } from '../../shared/api'
import { isValidPagesRange } from '../../shared/pagesRange'

const ACCEPTED = ['.pdf', '.hwp', '.hwpx']

function isPdf(file: File): boolean {
  return file.name.toLowerCase().endsWith('.pdf')
}

// 작업 만들기(업로드) 화면
export function UploadPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [scope, setScope] = useState('')
  const [pages, setPages] = useState('')
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
      })
      navigate(`/jobs/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드에 실패했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <h1>새 작업 만들기</h1>
      <p className="hint">입력 권장 순서: HWPX &gt; HWP &gt; PDF (추출이 더 정확하고 싸요)</p>

      <form onSubmit={handleSubmit} className="upload-form">
        <label>
          시험지 파일
          <input
            type="file"
            accept={ACCEPTED.join(',')}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
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
            placeholder="예: 수학1 지수함수와 로그함수"
            required
          />
        </label>

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
          {submitting ? '업로드 중...' : '작업 만들기'}
        </button>
      </form>
    </div>
  )
}
