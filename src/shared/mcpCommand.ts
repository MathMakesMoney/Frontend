export type CommandShell = 'powershell' | 'posix'
export type McpClient = 'claude' | 'codex'

// 셸이 제목과 요청 안의 실행 문자를 해석하지 않도록 한 인자로 감싼다
export function shellArgument(text: string, shell: CommandShell): string {
  return `'${text.replace(/'/g, shell === 'powershell' ? "''" : "'\"'\"'")}'`
}

export function mcpPrompt(origin: string, jobId: string, title: string): string {
  return `${title} 해설지 만들어줘. 기본 사용자 1의 작업: ${origin}/jobs/${encodeURIComponent(jobId)}. 풀이담(pulidam) 도구로 끝까지 진행해.`
}

export function mcpCommand(origin: string, jobId: string, title: string, shell: CommandShell, client: McpClient = 'claude'): string {
  const url = shellArgument(`${origin}/mcp`, shell)
  const prompt = shellArgument(mcpPrompt(origin, jobId, title), shell)
  const connect = client === 'claude' ? `claude mcp add -s user --transport http pulidam ${url}` : `codex mcp add pulidam --url ${url}`
  const approval = client === 'claude'
    ? "--allowedTools 'mcp__pulidam__*'"
    : `-c ${shellArgument('mcp_servers.pulidam.default_tools_approval_mode="approve"', shell)}`
  // claude --allowedTools 는 값을 여러 개 받아 뒤에 오는 요청 글까지 먹으므로 요청을 먼저 둔다
  return client === 'claude' ? `${connect} ; claude ${prompt} ${approval}` : `${connect} ; codex ${approval} ${prompt}`
}
