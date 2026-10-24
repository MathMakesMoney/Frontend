import { Fragment, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { joinEquation, splitEquation, type Part } from '../../shared/equation'
import { Equation } from '../../shared/RichText'

const text = (value: string): Part => ({ type: 'text', value })

// 줄마다 글·수식 조각으로. 줄 처음·끝과 수식 사이에 빈 글 조각을 둬 어디든 글을 넣는다 (빈 조각은 이을 때 사라진다)
export function toRows(value: string): Part[][] {
  const rows: Part[][] = [[]]
  for (const p of splitEquation(value)) {
    if (p.type === 'eq') rows[rows.length - 1].push(p)
    else p.value.split('\n').forEach((line, i) => {
      if (i > 0) rows.push([])
      rows[rows.length - 1].push(text(line))
    })
  }
  return rows.map(row => {
    const out: Part[] = []
    for (const p of row) {
      if (p.type === 'eq' && out[out.length - 1]?.type !== 'text') out.push(text(''))
      out.push(p)
    }
    if (out[out.length - 1]?.type !== 'text') out.push(text(''))
    return out
  })
}

// toRows 의 반대. 나눈 뒤 이으면 원문과 바이트가 같다
export const fromRows = (rows: Part[][]) => rows.map(joinEquation).join('\n')

// 한 조각을 다른 조각들로 바꾼 전체 문자열 (글 고치기, 수식 고치기·넣기·지우기). 다른 조각은 바이트 그대로
export function replaceFragment(value: string, row: number, index: number, parts: Part[]): string {
  const rows = toRows(value)
  rows[row].splice(index, 1, ...parts)
  return fromRows(rows)
}

// 고치는 중인 조각: eq 면 text 는 스크립트, around 는 수식 넣기 때 커서 앞뒤 글
interface Edit { row: number; index: number; eq: boolean; text: string; around?: [string, string] }

// 한글 IME 조합 중 Enter 는 글자 확정이라 무시한다 (Safari 는 keyCode 229)
const composing = (ev: KeyboardEvent) => ev.nativeEvent.isComposing || ev.keyCode === 229

// 글 + 수식 칩 편집칸: 글을 누르면 그 조각만 입력칸으로, 칩을 누르면 아래 작은 창에서 스크립트를 고치고 바로 미리 본다
export function EqText({ value, label, onChange }: { value: string; label: string; onChange: (value: string) => void }) {
  const [edit, setEdit] = useState<Edit | null>(null)
  const live = useRef(edit)
  live.current = edit
  const box = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const back = useRef('')

  // 키보드·창 버튼으로 닫으면 그 조각으로 포커스를 돌려준다
  useEffect(() => {
    if (!back.current) return
    box.current?.querySelector<HTMLElement>(`[data-frag="${back.current}"]`)?.focus()
    back.current = ''
  })

  // 고치기를 끝낸다. parts 가 있으면 그 조각을 parts 로 바꿔 저장, focusAt 이 있으면 그 조각으로 포커스
  function close(parts?: Part[], focusAt?: number) {
    const e = live.current
    if (!e) return
    live.current = null
    if (parts) onChange(replaceFragment(value, e.row, e.index, parts))
    if (focusAt !== undefined) back.current = `${e.row}-${focusAt}`
    setEdit(null)
  }

  function open(next: Edit) {
    live.current = next
    setEdit(next)
  }

  function textKey(ev: KeyboardEvent, e: Edit) {
    if (composing(ev)) return
    if (ev.key === 'Enter') { ev.preventDefault(); close([text(e.text)], e.index) }
    if (ev.key === 'Escape') { ev.preventDefault(); close(undefined, e.index) }
  }

  function apply(e: Edit) {
    if (!e.text.trim()) return
    const eq: Part = { type: 'eq', value: e.text }
    close(e.around ? [text(e.around[0]), eq, text(e.around[1])] : [eq], e.around ? e.index + 1 : e.index)
  }

  // 수식 넣기를 취소하면 고치던 글은 남긴다
  const cancel = (e: Edit) => close(e.around ? [text(e.around.join(''))] : undefined, e.index)

  const pop = (e: Edit) => (
    <div className="eq-pop" role="group" aria-label={`${label} 수식 고치기`}>
      {/* 수식은 한 줄이어야 저장된다: 붙여넣은 줄바꿈은 빈칸으로 */}
      <textarea autoFocus rows={2} aria-label="수식 스크립트" value={e.text}
        onChange={ev => setEdit({ ...e, text: ev.target.value.replace(/\r?\n/g, ' ') })}
        onKeyDown={ev => {
          if (composing(ev)) return
          if (ev.key === 'Escape') { ev.preventDefault(); cancel(e) }
          else if (ev.key === 'Enter') { ev.preventDefault(); apply(e) }
        }} />
      <div className="eq-preview" aria-label="미리보기">
        {e.text.trim() ? <Equation script={e.text} /> : <span className="hint">스크립트를 쓰면 여기에 모양이 보여요</span>}
      </div>
      <div className="eq-pop-actions">
        <button type="button" className="button" disabled={!e.text.trim()} onClick={() => apply(e)}>적용</button>
        <button type="button" className="button-plain" onClick={() => cancel(e)}>취소</button>
        {!e.around && <button type="button" className="button-plain eq-remove" onClick={() => close([], e.index - 1)}>지우기</button>}
        <span className="hint">Enter 적용, Esc 취소</span>
      </div>
    </div>
  )

  return (
    <div className="eq-field" role="group" aria-label={label} ref={box}>
      {toRows(value).map((parts, r) => (
        <Fragment key={r}>
          <div className="eq-row">
            {parts.map((p, i) => {
              const id = `${r}-${i}`
              if (edit && edit.row === r && edit.index === i) {
                const e = edit
                if (!e.eq) return (
                  // 입력칸과 수식 넣기 버튼 밖으로 나가면 고친 글을 반영한다 (닫히며 사라질 때는 live 가 바뀌어 무시)
                  <span key={i} className="eq-editing"
                    onBlur={ev => { if (live.current === e && !ev.currentTarget.contains(ev.relatedTarget as Node | null)) close([text(e.text)]) }}>
                    <input ref={input} autoFocus aria-label={`${label} 글`} value={e.text} size={Math.max(6, e.text.length + 2)}
                      onChange={ev => setEdit({ ...e, text: ev.target.value })} onKeyDown={ev => textKey(ev, e)} />
                    <button type="button" className="button-plain" onMouseDown={ev => ev.preventDefault()}
                      onClick={() => {
                        const at = input.current?.selectionStart ?? e.text.length
                        open({ ...e, eq: true, text: '', around: [e.text.slice(0, at), e.text.slice(at)] })
                      }}>수식 넣기</button>
                  </span>
                )
                if (e.around) return <span key={i} className="eq-text">{e.around[0]}<span className="eq-chip-btn active">새 수식</span>{e.around[1]}</span>
              }
              const here = edit?.eq === true && edit.row === r && edit.index === i
              if (p.type === 'eq') return (
                <button key={i} type="button" data-frag={id} className={`eq-chip-btn${here ? ' active' : ''}`} aria-label={`수식 ${p.value}`}
                  aria-expanded={here} onClick={() => open({ row: r, index: i, eq: true, text: p.value })}>
                  {p.value.trim() ? <Equation script={p.value} /> : '빈 수식'}
                </button>
              )
              const start = () => open({ row: r, index: i, eq: false, text: p.value })
              return (
                <span key={i} role="button" tabIndex={0} data-frag={id} className={p.value ? 'eq-text' : 'eq-text eq-gap'}
                  aria-label={p.value ? undefined : '글 넣기'} onClick={start}
                  onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); start() } }}>
                  {p.value}
                </span>
              )
            })}
          </div>
          {edit?.eq && edit.row === r && pop(edit)}
        </Fragment>
      ))}
    </div>
  )
}
