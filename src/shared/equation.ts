// <<EQ>>스크립트<</EQ>> 를 글자 조각과 수식 조각으로 나눈다 (한글 수식 스크립트, LaTeX 아님)
export interface TextPart {
  type: 'text'
  value: string
}
export interface EquationPart {
  type: 'eq'
  value: string
}
export type Part = TextPart | EquationPart

const OPEN = '<<EQ>>'
const CLOSE = '<</EQ>>'

export function splitEquation(input: string): Part[] {
  const parts: Part[] = []
  let rest = input
  while (rest.length > 0) {
    const openIdx = rest.indexOf(OPEN)
    if (openIdx === -1) {
      parts.push({ type: 'text', value: rest })
      break
    }
    if (openIdx > 0) parts.push({ type: 'text', value: rest.slice(0, openIdx) })
    const afterOpen = rest.slice(openIdx + OPEN.length)
    const closeIdx = afterOpen.indexOf(CLOSE)
    if (closeIdx === -1) {
      // 닫는 표시가 없으면 나머지를 글자로 둔다 (깨진 입력에 화면이 죽지 않게)
      parts.push({ type: 'text', value: rest.slice(openIdx) })
      break
    }
    parts.push({ type: 'eq', value: afterOpen.slice(0, closeIdx) })
    rest = afterOpen.slice(closeIdx + CLOSE.length)
  }
  return parts
}
