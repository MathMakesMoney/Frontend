import type { Feature, Problem } from '../../../shared/api'
import type { ProblemEntry } from './types'

type LayoutDoc = {
  pageCount(): number
  getPageControlLayout(page: number): string
  getTextInCell(sec: number, para: number, ctrl: number, cell: number, cellPara: number, offset: number, count: number): string
}

type Table = { type: string; secIdx: number; paraIdx: number; controlIdx: number; colCount: number; stableIndex: number[]; cells: { row: number; cellIdx: number }[] }

export type AcademyPage = { numbers: string[]; answer: boolean }

// 결과 문서(학원 양식) 쪽마다 번호 칸 글자를 읽는다: 본문 2열 표(쪽 표, 정답 표)의 0·2행 칸. 번호면 그 쪽 문항, '정답'이면 정답 쪽.
// 백엔드 AcademyWriter 가 문항 순서대로 01, 02 ... 를 번호 칸에 쓴다. 머리말 표는 본문 문단이 아니라 읽으면 오류라 건너뛴다
export function academyPages(doc: LayoutDoc): AcademyPage[] {
  return Array.from({ length: doc.pageCount() }, (_, page) => {
    const texts: string[] = []
    for (const t of JSON.parse(doc.getPageControlLayout(page)).controls as Table[]) {
      if (t.type !== 'table' || t.stableIndex.length !== 3 || t.colCount !== 2) continue
      for (const c of t.cells.filter((c) => c.row === 0 || c.row === 2)) {
        try {
          texts.push(doc.getTextInCell(t.secIdx, t.paraIdx, t.controlIdx, c.cellIdx, 0, 0, 8).trim())
        } catch {
          // 머리말 표
        }
      }
    }
    return { numbers: texts.filter((s) => /^\d+$/.test(s)), answer: texts.includes('정답') }
  })
}

// 쪽별 번호를 오른쪽 문항 목록(번호 NN = 문항 순서 NN 번째, 제외한 문항도 칸에 남는다)과 왼쪽 쪽 메모로 바꾼다.
// 문항 정보가 없으면 번호 칸 번호를 그대로 표시 번호로. 정답 쪽 뒤에 붙은 문서(해설지·변형)의 표 칸 숫자는 문항이 아니라 건너뛴다.
// 정답 쪽은 '정답', 그 뒤 쪽은 고른 기능대로 '해설', '변형', '해설·변형'
export function academyIndex(pages: AcademyPage[], problems: Problem[], features: Feature[] = []) {
  const answerAt = pages.findIndex((p) => p.answer)
  const entries: ProblemEntry[] = pages.flatMap((pg, page) =>
    answerAt >= 0 && page > answerAt
      ? []
      : [...pg.numbers]
          .sort((a, b) => Number(a) - Number(b))
          .map((n) => {
            const p = problems[Number(n) - 1]
            if (!p) return { label: String(Number(n)), page, answer: null, review: null, hasFigure: false }
            return { label: p.label ?? String(p.no), page, answer: p.answer ?? p.item?.answer ?? null, review: p.review ?? null, hasFigure: p.figures.length > 0 }
          }),
  )
  const after = [features.includes('haesol') && '해설', features.includes('variant') && '변형'].filter(Boolean).join('·')
  const notes = pages.map((p, i) => (p.answer ? '정답' : answerAt >= 0 && i > answerAt ? after || undefined : undefined))
  return { entries, notes }
}
