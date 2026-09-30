export type CommandShell = 'powershell' | 'posix'

// 셸이 제목과 요청 안의 실행 문자를 해석하지 않도록 한 인자로 감싼다
export function shellArgument(text: string, shell: CommandShell): string {
  return `'${text.replace(/'/g, shell === 'powershell' ? "''" : "'\"'\"'")}'`
}

export function mcpPrompt(origin: string, jobId: string, title: string): string {
  return `${title} 해설지 만들어줘. 작업 주소: ${origin}/jobs/${encodeURIComponent(jobId)}. 풀이담(pulidam) 도구를 써서 이 주소의 작업을 끝까지 진행해.`
}

export function mcpCommand(origin: string, jobId: string, title: string, shell: CommandShell): string {
  return `claude mcp add -s user --transport http pulidam ${shellArgument(`${origin}/mcp`, shell)} ; claude ${shellArgument(mcpPrompt(origin, jobId, title), shell)}`
}
