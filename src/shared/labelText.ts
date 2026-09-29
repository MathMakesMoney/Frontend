// 문항 표시 번호 문구: 숫자면 "20-1번", 서술형이면 "서술형 1" 그대로
export const labelText = (label: string | number): string => (String(label).startsWith('서술형') ? String(label) : `${label}번`)

// 좁은 번호판용 짧은 표기: "서술형 1-2" -> "서1-2"
export const shortLabel = (label: string | number): string => String(label).replace(/^서술형 /, '서')
