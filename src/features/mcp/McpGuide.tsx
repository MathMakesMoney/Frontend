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
        <p>1. MCP 를 지원하는 프로그램(Claude Code, Codex CLI, Gemini CLI 등)에서 한 번만 연결하세요 (아래는 Claude Code 명령)</p>
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
        Claude Desktop, claude.ai, ChatGPT 는 내 컴퓨터(localhost)에 접속할 수 없어 로컬 PoC 에서는 쓸 수
        없습니다.
      </p>
    </section>
  )
}
