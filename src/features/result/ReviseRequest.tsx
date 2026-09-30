import { useState } from 'react'

// 작업 제목과 주소를 포함해 풀이담에 문항 수정을 요청한다
export function revisePrompt(jobId: string, jobTitle: string, label: string, request: string, origin: string): string {
  const text = request.trim().replace(/\s+/g, ' ')
  return `${jobTitle} ${label} 해설을 고쳐줘: ${text}. 작업 주소: ${origin}/jobs/${encodeURIComponent(jobId)}. 풀이담(pulidam) 도구 get_problem으로 문항을 보고 save_revision으로 저장해.`
}

export function ReviseRequest({ jobId, jobTitle, label, requests }: { jobId: string; jobTitle: string; label: string; requests: string[] }) {
  const [open, setOpen] = useState(false)
  const [request, setRequest] = useState('')
  const [copied, setCopied] = useState(false)
  const command = request.trim() ? revisePrompt(jobId, jobTitle, label, request, window.location.origin) : ''

  async function copy() {
    await navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="revise">
      {requests.length > 0 && (
        <p className="revise-history">
          강사 요청으로 고침: {requests.map((r, i) => <span key={i}>“{r}”</span>)}
        </p>
      )}
      {!open ? (
        <button type="button" className="button-plain" onClick={() => setOpen(true)}>
          이 해설 고쳐 달라고 하기
        </button>
      ) : (
        <div className="revise-box">
          <label htmlFor={`revise-${label}`}>어떻게 고칠까요?</label>
          <textarea
            id={`revise-${label}`}
            rows={2}
            value={request}
            placeholder="예: 그림에서 두 점의 좌표를 먼저 쓰고 거리 공식으로 계산해 줘"
            onChange={(e) => setRequest(e.target.value)}
          />
          {command && (
            <div className="code-row">
              <code>{command}</code>
              <button type="button" className="copy-button" onClick={copy}>
                {copied ? '복사됨' : '프롬프트 복사'}
              </button>
            </div>
          )}
          <p className="hint">풀이담 도구를 연결한 AI 대화창에 붙여넣으면 AI가 이 문항만 고쳐 저장하고 해설지를 다시 만듭니다. 끝나면 이 화면이 새로 고쳐집니다.</p>
        </div>
      )}
    </div>
  )
}
