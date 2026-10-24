import type { Feature, Problem } from '../../../shared/api'
import type { ProblemEntry } from './types'

type LayoutDoc = {
  pageCount(): number
  getPageControlLayout(page: number): string
  getTextInCell(sec: number, para: number, ctrl: number, cell: number, cellPara: number, offset: number, count: number): string
}

type Cell = { row: number; col: number; cellIdx: number; x: number; y: number; w: number; h: number }
type Table = { type: string; secIdx: number; paraIdx: number; controlIdx: number; colCount: number; stableIndex: number[]; cells: Cell[] }

// 쪽 그림(SVG) 좌표의 사각형
export type Box = { x: number; y: number; w: number; h: number }

// boxes: 번호 칸 글자 -> 그 문항 사각형
export type AcademyPage = { numbers: string[]; answer: boolean; boxes: Record<string, Box> }

// 문항 사각형: 번호 칸과 같은 열 바로 아래 문제 칸을 합친다 (문제 칸이 없으면 번호 칸만). 소수 한 자리
export function problemBox(cells: Cell[], num: Cell): Box {
  const body = cells.find((c) => c.col === num.col && c.row === num.row + 1) ?? num
  const x = Math.min(num.x, body.x)
  const y = Math.min(num.y, body.y)
  const r = (v: number) => Math.round(v * 10) / 10
  return { x: r(x), y: r(y), w: r(Math.max(num.x + num.w, body.x + body.w) - x), h: r(Math.max(num.y + num.h, body.y + body.h) - y) }
}

// 결과 문서(학원 양식) 쪽마다 번호 칸 글자를 읽는다: 본문 2열 표(쪽 표, 정답 표)의 0·2행 칸. 번호면 그 쪽 문항, '정답'이면 정답 쪽.
// 백엔드 AcademyWriter 가 문항 순서대로 01, 02 ... 를 번호 칸에 쓴다. 머리말 표는 본문 문단이 아니라 읽으면 오류라 건너뛴다
export function academyPages(doc: LayoutDoc): AcademyPage[] {
  return Array.from({ length: doc.pageCount() }, (_, page) => {
    const texts: string[] = []
    const boxes: Record<string, Box> = {}
    for (const t of JSON.parse(doc.getPageControlLayout(page)).controls as Table[]) {
      if (t.type !== 'table' || t.stableIndex.length !== 3 || t.colCount !== 2) continue
      for (const c of t.cells.filter((c) => c.row === 0 || c.row === 2)) {
        try {
          const text = doc.getTextInCell(t.secIdx, t.paraIdx, t.controlIdx, c.cellIdx, 0, 0, 8).trim()
          texts.push(text)
          if (/^\d+$/.test(text)) boxes[text] = problemBox(t.cells, c)
        } catch {
          // 머리말 표
        }
      }
    }
    return { numbers: texts.filter((s) => /^\d+$/.test(s)), answer: texts.includes('정답'), boxes }
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
            const box = pg.boxes[n]
            if (!p) return { label: String(Number(n)), page, answer: null, review: null, hasFigure: false, box }
            return { label: p.label ?? String(p.no), page, answer: p.answer ?? p.item?.answer ?? null, review: p.review ?? null, hasFigure: p.figures.length > 0, box }
          }),
  )
  const after = [features.includes('haesol') && '해설', features.includes('variant') && '변형'].filter(Boolean).join('·')
  const notes = pages.map((p, i) => (p.answer ? '정답' : answerAt >= 0 && i > answerAt ? after || undefined : undefined))
  return { entries, notes }
}
