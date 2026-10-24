import { useState } from 'react'
import type { AcademyPart, ItemFields, Problem } from '../../shared/api'
import { EqText } from './EqText'

const CELL_PIC = /\[그림:\S+ \d+ \d+\]/

export interface GridCell {
  index: number
  text: string
  rowSpan: number
  colSpan: number
  picture: boolean
}

// 자료 표 T 를 행마다 보이는 칸으로: 합친 칸은 rowSpan·colSpan, 가려진 칸은 뺀다 (text "행 열 행,열,행 수,열 수 ..")
export function gridRows(part: AcademyPart): GridCell[][] {
  const words = part.text.split(' ')
  const rows = Number(words[0]), cols = Number(words[1])
  const span = new Map<number, [number, number]>()
  const hidden = new Set<number>()
  for (const w of words) {
    const n = w.split(',').map(Number)
    if (n.length !== 4) continue
    const [r, c, rs, cs] = n
    span.set(r * cols + c, [rs, cs])
    for (let i = 0; i < rs; i++) for (let j = 0; j < cs; j++) if (i + j > 0) hidden.add((r + i) * cols + c + j)
  }
  const out: GridCell[][] = []
  for (let r = 0; r < rows; r++) {
    const row: GridCell[] = []
    for (let c = 0; c < cols; c++) {
      const index = r * cols + c
      if (hidden.has(index)) continue
      const [rowSpan, colSpan] = span.get(index) ?? [1, 1]
      const text = part.box[index] ?? ''
      row.push({ index, text, rowSpan, colSpan, picture: CELL_PIC.test(text) })
    }
    out.push(row)
  }
  return out
}

// 편집 중인 값. cells 는 "조각:칸" -> 글 (손댄 칸만)
export interface ItemDraft {
  stem: string
  choices: string[]
  cells: Record<string, string>
  answer: string
}

const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩'

// 객관식 정답의 숫자를 동그라미 숫자로 ('3' -> '③', '2,4' -> '②, ④'). 서술형, 이미 동그라미, 숫자만이 아닌 답은 그대로
export function circledAnswer(text: string, hasChoices: boolean): string {
  const tokens = text.trim().split(/[\s,]+/).filter(Boolean)
  if (!hasChoices || !tokens.some(w => /^\d+$/.test(w))) return text
  const out = tokens.map(w => (/^\d+$/.test(w) ? CIRCLED[Number(w) - 1] : w.length === 1 && CIRCLED.includes(w) ? w : undefined))
  return out.every(Boolean) ? out.join(', ') : text
}

// 바뀐 것만 보낸다 (안 바뀐 것만 보내면 서버가 '고친 곳이 없다' 로 거절). 선지는 하나라도 바뀌면 전체, 칸은 바뀐 칸만
export function changedFields(problem: Problem, answer: string, draft: ItemDraft): ItemFields {
  const out: ItemFields = {}
  if (draft.stem !== problem.stem) out.stem = draft.stem
  const choices = problem.item?.choices ?? []
  if (draft.choices.some((c, i) => c !== choices[i])) out.choices = draft.choices
  const cells = Object.entries(draft.cells)
    .map(([key, text]) => {
      const [part, index] = key.split(':').map(Number)
      return { part, index, text }
    })
    .filter(c => c.text !== problem.item?.parts[c.part]?.box[c.index])
  if (cells.length) out.cells = cells
  // 객관식은 숫자를 동그라미로 바꿔 비교한다. 원래 값 그대로인 답은 손대지 않은 것
  const typed = draft.answer.trim()
  const circled = circledAnswer(typed, draft.choices.length > 0)
  if (typed && typed !== answer && circled !== answer) out.answer = circled
  return out
}

// 문항 데이터 손 수정 (보류 결정 '직접 고치기'와 문항 카드가 같이 쓴다): 발문, 선지, 자료 표 칸, 정답.
// cells 가 거짓이면(AI 로 뽑은 문항) 표는 발문의 표 줄에서 고친다. 저장 실패 사유는 서버 문장 그대로
// 발문·선지·칸은 글 + 수식 칩(EqText)으로 보이고, '원문으로 보기'를 누르면 스크립트 원문 입력칸
export function ItemEditor({ problem, answer, answerLabel, cells, onSave }: {
  problem: Problem
  answer: string
  answerLabel: string
  cells: boolean
  onSave: (fields: ItemFields) => Promise<unknown>
}) {
  const item = problem.item
  const [draft, setDraft] = useState<ItemDraft>({ stem: problem.stem, choices: item?.choices ?? [], cells: {}, answer })
  const [raw, setRaw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const id = `item-${problem.no}`

  async function save() {
    const fields = changedFields(problem, answer, draft)
    if (Object.keys(fields).length === 0) return setError('고친 곳이 없어요')
    setBusy(true)
    setError('')
    try {
      await onSave(fields)
    } catch (e) {
      setError(e instanceof Error ? e.message : '고친 내용을 저장하지 못했어요')
    } finally {
      setBusy(false)
    }
  }

  const tables = cells ? (item?.parts ?? []).map((part, i) => ({ part, i })).filter(t => t.part.kind === 'T') : []
  return (
    <div className="revise-box item-editor">
      <div className="item-editor-mode">
        <span className="hint">{raw ? '수식이 스크립트 원문으로 보여요' : '글을 누르면 그 자리에서, 수식을 누르면 작은 창에서 고쳐요. 줄을 늘리거나 줄이려면 원문으로 보기'}</span>
        <button type="button" className="button-plain" aria-pressed={raw} onClick={() => setRaw(!raw)}>원문으로 보기</button>
      </div>
      <label htmlFor={raw ? `${id}-stem` : undefined}>
        {cells ? '발문 (줄 수는 그대로, 표·그림 줄은 못 고쳐요. 표 칸은 아래 표에서 고쳐요)' : '발문 (표는 발문의 표 줄에서 칸 사이 | 로 고쳐요)'}
      </label>
      {raw
        ? <textarea id={`${id}-stem`} rows={4} value={draft.stem} onChange={e => setDraft({ ...draft, stem: e.target.value })} />
        : <EqText value={draft.stem} label="발문" onChange={stem => setDraft(d => ({ ...d, stem }))} />}
      {draft.choices.length > 0 && <span className="field-label">선지 (개수는 그대로)</span>}
      {draft.choices.map((c, i) => {
        const setChoice = (v: string) => setDraft(d => ({ ...d, choices: d.choices.map((x, k) => (k === i ? v : x)) }))
        return raw
          ? <input key={i} aria-label={`선지 ${i + 1}`} value={c} onChange={e => setChoice(e.target.value)} />
          : <EqText key={i} value={c} label={`선지 ${i + 1}`} onChange={setChoice} />
      })}
      {tables.map(({ part, i }) => (
        <table key={i} className="item-table">
          <tbody>
            {gridRows(part).map((row, r) => (
              <tr key={r}>
                {row.map(cell => {
                  const key = `${i}:${cell.index}`
                  const setCell = (v: string) => setDraft(d => ({ ...d, cells: { ...d.cells, [key]: v } }))
                  const text = draft.cells[key] ?? cell.text
                  return (
                    <td key={cell.index} rowSpan={cell.rowSpan} colSpan={cell.colSpan}>
                      {cell.picture ? <span className="hint">(그림)</span> : raw
                        ? <input aria-label={`표 칸 ${cell.index + 1}`} value={text} onChange={e => setCell(e.target.value)} />
                        : <EqText value={text} label={`표 칸 ${cell.index + 1}`} onChange={setCell} />}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      ))}
      <label htmlFor={`${id}-answer`}>{answerLabel}</label>
      {/* 객관식 숫자 답은 칸을 떠날 때 동그라미로 (입력 중에 바꾸면 커서가 튄다). 원래 값 그대로면 두기 */}
      <input id={`${id}-answer`} value={draft.answer} onChange={e => setDraft({ ...draft, answer: e.target.value })}
        onBlur={() => setDraft(d => (d.answer.trim() === answer ? d : { ...d, answer: circledAnswer(d.answer, d.choices.length > 0) }))} />
      <button type="button" className="button" disabled={busy} onClick={save}>고친 내용 저장</button>
      <p className="hint">발문·선지·표를 고치면 해설을 고른 작업은 이 문항을 다시 풀어요. 그림 칸과 합친 칸에 가려진 칸은 못 고쳐요</p>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  )
}
