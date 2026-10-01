import { describe, expect, it } from 'vitest'
import { shellArgument, mcpCommand, mcpPrompt } from './mcpCommand'

describe('복사 명령', () => {
  it('셸별로 작은따옴표와 실행 문자를 문자 그대로 감싼다', () => {
    const text = "제목 ' $HOME `whoami` $(touch nope)\n둘째 줄"
    expect(shellArgument(text, 'powershell')).toBe("'제목 '' $HOME `whoami` $(touch nope)\n둘째 줄'")
    expect(shellArgument(text, 'posix')).toBe("'제목 '\"'\"' $HOME `whoami` $(touch nope)\n둘째 줄'")
  })
  it('제목으로 요청하고 작업 주소로 정확한 작업을 구분한다', () => {
    const prompt = mcpPrompt('https://study.example', '7', '중간고사')
    expect(prompt).toContain('중간고사 해설지')
    expect(prompt).toContain('https://study.example/jobs/7')
    expect(prompt).toContain('풀이담')
    expect(prompt).not.toContain('작업 7')
    expect(mcpCommand('https://study.example', '7', '중간고사', 'posix')).toContain("'https://study.example/mcp'")
  })
})

it('Codex 연결과 실행에 현재 작업 및 환경 변수 인증을 사용한다', () => {
  for (const shell of ['posix', 'powershell'] as const) {
    const command = mcpCommand('https://www.math2hwp.com', '2', "중간 ' $시험", shell, 'codex')
    expect(command).toContain("codex mcp add pulidam --url 'https://www.math2hwp.com/mcp'")
    expect(command).toContain('mcp_servers.pulidam.env_http_headers={Authorization="MMM_MCP_AUTH"}')
    expect(command).toContain('jobs/2')
    expect(command).not.toContain('claude ')
    expect(command).toContain(shell === 'posix' ? 'read -r -s mmm_password' : 'Read-Host -AsSecureString')
  }
})

it('로컬 Codex 연결에는 원격 서버 비밀번호를 요구하지 않는다', () => {
  const command = mcpCommand('http://localhost:5173', '1', '시험', 'posix', 'codex')
  expect(command).toContain('codex mcp add pulidam --url')
  expect(command).not.toContain('MMM_MCP_AUTH')
})
