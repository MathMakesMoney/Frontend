import { useState } from 'react'
import { mcpCommand, mcpPrompt, type McpClient, type CommandShell } from '../../shared/mcpCommand'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="copy-button"
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? '복사됨' : '복사'}
    </button>
  )
}

// 현재 사이트 주소와 작업 제목으로 연결 및 실행 명령을 만든다
export function McpGuide({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const [client, setClient] = useState<McpClient>('codex')
  const [shell, setShell] = useState<CommandShell>('powershell')
  const origin = window.location.origin
  const mcpUrl = `${origin}/mcp`
  const prompt = mcpPrompt(origin, jobId, jobTitle)
  const command = mcpCommand(origin, jobId, jobTitle, shell, client)
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)

  return (
    <section className="mcp-guide">
      <h2>MCP 로 풀이 진행하기</h2>

      <div className="mcp-step">
        <p>터미널에 아래 명령을 붙여넣으세요. {client === 'codex' ? 'Codex' : 'Claude Code'}가 켜지면서 해설을 만듭니다</p>
        <label>사용하는 AI{' '}
          <select value={client} onChange={(e) => setClient(e.target.value as McpClient)}>
            <option value="codex">Codex CLI</option>
            <option value="claude">Claude Code</option>
          </select>
        </label>
        <label>사용하는 터미널{' '}
          <select value={shell} onChange={(e) => setShell(e.target.value as CommandShell)}>
            <option value="powershell">윈도우 PowerShell</option>
            <option value="posix">맥 · 리눅스</option>
          </select>
        </label>
        {client === 'codex' && !local && <p>실행하면 서버 admin 비밀번호를 묻습니다. 비밀번호는 웹사이트에 입력하지 않습니다. Codex CLI 설치와 ChatGPT 로그인이 필요합니다.</p>}
        <div className="code-row">
          <code>{command}</code>
          <CopyButton text={command} />
        </div>
      </div>

      <p className="hint">
        다른 MCP 프로그램(Gemini CLI 등)은 서버 주소 {mcpUrl} 를 연결한 뒤 대화창에 &quot;{prompt}&quot; 를
        입력하세요. 연결 이름은 pulidam입니다.
        {local && ' 현재 주소는 내 컴퓨터(localhost)용입니다. 원격 AI에서는 접근할 수 없으므로 웹에서 연결하는 방식은 배포 후 사용하세요.'}
      </p>
    </section>
  )
}
