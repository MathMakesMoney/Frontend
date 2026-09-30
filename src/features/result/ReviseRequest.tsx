import { useState } from 'react'

// 해설 수정 요청: 강사가 고칠 내용을 쓰면 Claude Code 에 붙여넣을 명령 한 줄을 만든다.
// 사용자의 Claude 가 mmm 도구 get_problem 으로 문항을 보고 save_revision 으로 그 문항만 고쳐 저장한다 (MCP 버전, 우리 서버는 AI 를 부르지 않는다)
export function reviseCommand(jobId: string, label: string, request: string): string {
  const text = request.trim().replace(/\s+/g, ' ').replace(/"/g, "'")
  return `claude "작업 ${jobId} ${label} 해설을 고쳐줘: ${text}. mmm 도구 get_problem 으로 문항을 보고 save_revision 으로 저장해."`
}

export function ReviseRequest({ jobId, label, requests }: { jobId: string; label: string; requests: string[] }) {
  const [open, setOpen] = useState(false)
  const [request, setRequest] = useState('')
  const [copied, setCopied] = useState(false)
  const command = request.trim() ? reviseCommand(jobId, label, request) : ''

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
                {copied ? '복사됨' : '명령 복사'}
              </button>
            </div>
          )}
          <p className="hint">터미널(PowerShell)에 붙여넣으면 Claude Code 가 이 문항만 고쳐 저장하고 해설지를 다시 만듭니다. 끝나면 이 화면이 새로 고쳐집니다.</p>
        </div>
      )}
    </div>
  )
}
