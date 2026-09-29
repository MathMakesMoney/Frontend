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

// MCP 안내: 터미널에 붙여넣을 명령 한 줄 (연결 + Claude Code 실행 + 문장 입력), 다른 프로그램용 주소, 로컬 접속 주의
// 연결은 이미 돼 있으면 "이미 있음" 오류만 내고 넘어간다. ; 는 PowerShell, 맥·리눅스 터미널에서 모두 다음 명령으로 이어진다
export function McpGuide({ jobId }: { jobId: string }) {
  const mcpUrl = `${window.location.origin}/mcp`
  const prompt = `작업 ${jobId} 해설지 만들어줘. mmm 도구를 써서 끝까지 진행해.`
  const command = `claude mcp add -s user --transport http mmm ${mcpUrl} ; claude "${prompt}"`

  return (
    <section className="mcp-guide">
      <h2>MCP 로 풀이 진행하기</h2>

      <div className="mcp-step">
        <p>터미널(윈도우는 PowerShell)에 아래 명령을 붙여넣으세요. Claude Code 가 켜지면서 바로 해설을 만듭니다</p>
        <div className="code-row">
          <code>{command}</code>
          <CopyButton text={command} />
        </div>
      </div>

      <p className="hint">
        다른 MCP 프로그램(Codex CLI, Gemini CLI 등)은 서버 주소 {mcpUrl} 를 연결한 뒤 대화창에 &quot;{prompt}&quot; 를
        입력하세요. Claude Desktop, claude.ai, ChatGPT 는 내 컴퓨터(localhost)에 접속할 수 없어 로컬 PoC 에서는 쓸 수
        없습니다.
      </p>
    </section>
  )
}
