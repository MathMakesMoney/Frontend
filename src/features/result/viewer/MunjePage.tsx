import type { MunjePart, VariantMunje } from '../../../shared/api'
import { RichText } from '../../../shared/RichText'

// 변형문제 학생용 문제지 쪽: 한글 문제지(MunjeWriter)와 같은 칸 배치. 세로 2단, 한 쪽 4칸(단마다 위아래),
// 긴 문항(long)은 단 전체. 긴 문항이 단 아래 칸 차례면 다음 단으로 넘긴다

export type MunjeItem = VariantMunje['items'][number]

export interface MunjeCell {
  item: MunjeItem
  page: number
  col: number // 0 왼쪽 단, 1 오른쪽 단
  row: number // 0 위 칸, 1 아래 칸
  span: number // 1 또는 2 (단 전체)
}

// 칸 번호(한 쪽에 0~3)를 차례로 매긴다 (MunjeWriter.write 와 같은 규칙)
export function munjeCells(items: MunjeItem[]): MunjeCell[] {
  let slot = 0
  return items.map((item) => {
    if (item.long && slot % 2 === 1) slot++
    const cell = { item, page: Math.floor(slot / 4), col: Math.floor((slot % 4) / 2), row: slot % 2, span: item.long ? 2 : 1 }
    slot += cell.span
    return cell
  })
}

export function munjePageCount(cells: MunjeCell[]): number {
  return cells.length === 0 ? 0 : cells[cells.length - 1].page + 1
}

// 상자 줄 표시(ㄱ. 또는 (가))
const MARK = /^\s*([ㄱ-ㅎ]\.|\([가-힣]\))\s*/

// 상자 한 줄: 표시를 따로 떼어 내어쓰기 (넘어간 줄이 표시 뒤 글자 위치에서 시작하고 표시 아래는 빈다)
function BoxLine({ text }: { text: string }) {
  const m = text.match(MARK)
  if (!m) return <div className="haesol-line"><RichText text={text} display /></div>
  return (
    <div className="haesol-line munje-hang">
      <span className="munje-mark">{m[1]}</span>
      <span><RichText text={text.slice(m[0].length)} display /></span>
    </div>
  )
}

// A4 한 쪽. 1쪽은 제목과 반·번호·이름 줄, 쪽마다 머리말과 쪽 번호. active 는 고른 문항
export function MunjePage({ title, header, cells, index, active }: {
  title: string
  header: string
  cells: MunjeCell[]
  index: number
  active?: string | null
}) {
  const first = index === 0
  return (
    <div className="preview-page">
      {first && <div className="haesol-title">{title}</div>}
      <div className="haesol-header">{header}</div>
      {first && <div className="munje-student">반:&emsp;&emsp;&emsp;번호:&emsp;&emsp;&emsp;이름:</div>}
      <div className={`munje-body${first ? ' first' : ''}`}>
        {cells
          .filter((c) => c.page === index)
          .map((c) => {
            const parts: MunjePart[] = c.item.parts ?? c.item.stem.split('\n').map((text) => ({ text }))
            return (
              <div
                key={c.item.label}
                className={`munje-cell${active === c.item.label ? ' haesol-active' : ''}`}
                data-label={c.item.label}
                style={{ gridColumn: c.col + 1, gridRow: `${c.row + 1} / span ${c.span}` }}
              >
                <div className="munje-no">{c.item.label}</div>
                {parts.map((part, i) =>
                  'text' in part ? (
                    <div key={i} className="haesol-line"><RichText text={part.text} display /></div>
                  ) : (
                    <div key={i} className="munje-box">
                      {part.title && <span className="munje-box-title">{part.title}</span>}
                      {part.box.map((l, j) => (
                        <BoxLine key={j} text={l} />
                      ))}
                    </div>
                  ),
                )}
                {c.item.choices.length > 0 && (
                  <div className="munje-choices">
                    {c.item.choices.map((ch, i) => (
                      <span key={i}><RichText text={ch} /></span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
      </div>
      <div className="haesol-footer">- {index + 1} -</div>
    </div>
  )
}
