// 쪽 범위 문구 검사 (예: "1-8,13-16"). 최종 판단(총 쪽 수 초과 등)은 백엔드
export function isValidPagesRange(input: string): boolean {
  if (input.trim() === '') return true
  const chunks = input.split(',')
  for (const chunk of chunks) {
    const piece = chunk.trim()
    if (piece === '') return false
    const m = piece.match(/^(\d+)(?:-(\d+))?$/)
    if (!m) return false
    const start = Number(m[1])
    const end = m[2] === undefined ? start : Number(m[2])
    if (start === 0 || end === 0) return false
    if (end < start) return false
  }
  return true
}

