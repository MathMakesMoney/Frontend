import { useState } from 'react'

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

// MCP 연결 안내: 연결 명령, 대화창에 붙일 문장, 로컬 접속 주의
export function McpGuide({ jobId }: { jobId: string }) {
  const mcpUrl = `${window.location.origin}/mcp`
  const connectCmd = `claude mcp add --transport http mmm ${mcpUrl}`
  const prompt = `작업 ${jobId} 해설지 만들어줘. mmm 도구를 써서 끝까지 진행해.`

  return (
    <section className="mcp-guide">
      <h2>MCP 로 풀이 진행하기</h2>

      <div className="mcp-step">
        <p>1. Claude Code 에서 한 번만 연결하세요</p>
        <div className="code-row">
          <code>{connectCmd}</code>
          <CopyButton text={connectCmd} />
        </div>
      </div>

      <div className="mcp-step">
        <p>2. 대화창에 아래 문장을 붙여넣으세요</p>
        <div className="code-row">
          <code>{prompt}</code>
          <CopyButton text={prompt} />
        </div>
      </div>

      <p className="hint">
        Claude Desktop, claude.ai 같은 커넥터는 로컬 서버에 접속할 수 없습니다. Claude Code 를
        사용하세요.
      </p>
    </section>
  )
}
