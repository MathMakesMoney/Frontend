export type CommandShell = 'powershell' | 'posix'
export type McpClient = 'claude' | 'codex'

// 셸이 제목과 요청 안의 실행 문자를 해석하지 않도록 한 인자로 감싼다
export function shellArgument(text: string, shell: CommandShell): string {
  return `'${text.replace(/'/g, shell === 'powershell' ? "''" : "'\"'\"'")}'`
}

export function mcpPrompt(origin: string, jobId: string, title: string): string {
  return `${title} 해설지 만들어줘. 작업 주소: ${origin}/jobs/${encodeURIComponent(jobId)}. 풀이담(pulidam) 도구를 써서 이 주소의 작업을 끝까지 진행해.`
}

export function mcpCommand(origin: string, jobId: string, title: string, shell: CommandShell, client: McpClient = 'claude'): string {
  const url = shellArgument(`${origin}/mcp`, shell)
  const prompt = shellArgument(mcpPrompt(origin, jobId, title), shell)
  const connect = client === 'claude' ? `claude mcp add -s user --transport http pulidam ${url}` : `codex mcp add pulidam --url ${url}`
  if (['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname)) return `${connect} ; ${client} ${prompt}`
  const config = shellArgument('mcp_servers.pulidam.env_http_headers={Authorization="MMM_MCP_AUTH"}', shell)
  // 원격 서버 비밀번호는 터미널에서만 입력하고 현재 Codex 실행의 환경 변수로 전달한다.
  const auth = shell === 'posix'
    ? `printf '서버 admin 비밀번호: '; read -r -s mmm_password; printf '\n'; export MMM_MCP_AUTH="Basic $(printf 'admin:%s' "$mmm_password" | base64 | tr -d '\n')"; unset mmm_password`
    : `$mmmPassword = Read-Host -AsSecureString '서버 admin 비밀번호'; $env:MMM_MCP_AUTH = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('admin:' + [System.Net.NetworkCredential]::new('', $mmmPassword).Password)); Remove-Variable mmmPassword`
  const cleanup = shell === 'posix' ? 'unset MMM_MCP_AUTH' : 'Remove-Item Env:MMM_MCP_AUTH'
  const run = client === 'codex'
    ? `${connect}; codex -c ${config} ${prompt}`
    : `${connect} --header "Authorization: ${shell === 'posix' ? '$MMM_MCP_AUTH' : '$env:MMM_MCP_AUTH'}"; claude ${prompt}`
  return `${auth}; ${run}; ${cleanup}`
}
