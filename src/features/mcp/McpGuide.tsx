import { useState } from 'react'
import { mcpCommand, type McpClient, type CommandShell } from '../../shared/mcpCommand'

// 현재 기기에 맞는 명령을 만들고 AI 선택과 복사만 보여 준다.
export function McpGuide({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const [client, setClient] = useState<McpClient>('codex')
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const shell: CommandShell = /Win/i.test(navigator.platform) ? 'powershell' : 'posix'
  const origin = window.location.origin
  const command = mcpCommand(origin, jobId, jobTitle, shell, client)
  const name = client === 'claude' ? 'Claude Code' : 'Codex'

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(command)
      setCopyError(false)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopyError(true)
    }
  }

  return (
    <section className="mcp-guide mcp-connect" aria-labelledby="mcp-connect-title">
      <div className="mcp-connect-heading">
        <div>
          <span className="mcp-eyebrow">AI 연결</span>
          <h2 id="mcp-connect-title">어떤 AI로 해설을 만들까요?</h2>
          <p>사용 중인 AI를 선택하세요. 저장된 작업부터 이어서 진행합니다.</p>
        </div>
        <span className="mcp-status"><span />시험지 준비 완료</span>
      </div>

      <div className="mcp-client-grid" role="group" aria-label="해설을 만들 AI 선택">
        <button type="button" className={`mcp-client-card mcp-client-claude ${client === 'claude' ? 'is-selected' : ''}`}
          aria-pressed={client === 'claude'} onClick={() => { setClient('claude'); setCopied(false); setCopyError(false) }}>
          <span className="mcp-client-icon" aria-hidden="true">✳</span>
          <span className="mcp-client-copy"><strong>Claude</strong><span>Claude Code로 진행</span></span>
          <span className="mcp-client-check" aria-hidden="true">{client === 'claude' ? '✓' : ''}</span>
        </button>
        <button type="button" className={`mcp-client-card mcp-client-codex ${client === 'codex' ? 'is-selected' : ''}`}
          aria-pressed={client === 'codex'} onClick={() => { setClient('codex'); setCopied(false); setCopyError(false) }}>
          <span className="mcp-client-icon" aria-hidden="true">&gt;_</span>
          <span className="mcp-client-copy"><strong>Codex</strong><span>ChatGPT 계정으로 진행</span></span>
          <span className="mcp-client-check" aria-hidden="true">{client === 'codex' ? '✓' : ''}</span>
        </button>
      </div>

      <div className="mcp-connect-action">
        <div><strong>{name}에서 이어서 만들기</strong><p>명령을 복사해 내 컴퓨터의 터미널에 붙여넣으세요.</p></div>
        <button type="button" className="button mcp-copy-action" onClick={copyCommand}>
          {copied ? '복사 완료 ✓' : `${name} 연결 명령 복사`}<span aria-hidden="true"> ↗</span>
        </button>
      </div>
      <p className="mcp-connect-note">예상 소요 시간 약 30~60분 · 30문항 시험지는 약 41분 걸린 사례가 있습니다. 문항 수와 AI에 따라 더 걸릴 수 있습니다.</p>
      <p className="mcp-connect-note">{name} 설치와 계정 로그인이 필요합니다. 연결 명령 하나로 시작할 수 있습니다.</p>
      <p className="mcp-copy-feedback" role="status">{copyError ? '복사하지 못했습니다. 아래 연결 명령을 펼쳐 직접 복사해 주세요.' : copied ? '복사한 명령을 터미널에 붙여넣으면 AI가 시작됩니다.' : ''}</p>
      <details className="mcp-command-details"><summary>연결 명령 보기</summary><pre><code>{command}</code></pre></details>
    </section>
  )
}
