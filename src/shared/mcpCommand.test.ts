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
    expect(prompt).toContain('기본 사용자 1')
    expect(prompt).not.toContain('작업 7')
    expect(mcpCommand('https://study.example', '7', '중간고사', 'posix')).toContain("'https://study.example/mcp'")
  })
})

it('Claude와 Codex 모두 인증 입력 없이 한 줄로 연결하고 실행한다', () => {
  for (const shell of ['posix', 'powershell'] as const) {
    for (const client of ['claude', 'codex'] as const) {
      const command = mcpCommand('https://www.math2hwp.com', '2', "중간 ' $시험", shell, client)
      expect(command).toContain("'https://www.math2hwp.com/mcp'")
      expect(command).toContain('jobs/2')
      expect(command).toContain(`${client} `)
      expect(command).not.toContain('MMM_MCP_AUTH')
      expect(command).not.toContain('Read-Host')
      expect(command).not.toContain('read -r')
    }
  }
})
