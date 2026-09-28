import katex from 'katex'
import 'katex/dist/katex.min.css'
import { splitEquation } from './equation'
import { toLatex } from './hwpeq'

// [그림], [그림:id], [그림파일:경로] 는 그림 자리 표시, [그림 1]처럼 번호 붙은 건 원문 글자
const FIGURE_MARKER = /^\[그림(?::[^\]]*)?\]$/

function renderTextPart(text: string, key: string) {
  // 그림 자리 표시만 태그로 바꾸고 나머지는 그대로 둔다
  const tokens = text.split(/(\[그림(?::[^\]]*)?\])/g)
  return tokens.map((token, i) =>
    FIGURE_MARKER.test(token) ? (
      <span key={`${key}-${i}`} className="figure-tag">
        그림
      </span>
    ) : (
      <span key={`${key}-${i}`}>{token}</span>
    ),
  )
}

// 한글 수식 스크립트를 LaTeX 로 바꿔 KaTeX 로 그린다. 실패하면 스크립트 원문 칩
function Equation({ script }: { script: string }) {
  let html = ''
  try {
    html = katex.renderToString(toLatex(script), { throwOnError: false, strict: false })
  } catch {
    // 아래에서 원문 칩으로 보여 준다
  }
  if (!html || html.includes('katex-error')) {
    return (
      <span className="eq-chip" data-eq-fallback="">
        {script}
      </span>
    )
  }
  return <span className="eq" dangerouslySetInnerHTML={{ __html: html }} />
}

// 본문(발문·풀이 등)을 수식 + 그림 태그로 렌더링
export function RichText({ text }: { text: string }) {
  const parts = splitEquation(text)
  return (
    <>
      {parts.map((part, i) =>
        part.type === 'eq' ? (
          <Equation key={i} script={part.value} />
        ) : (
          <span key={i}>{renderTextPart(part.value, String(i))}</span>
        ),
      )}
    </>
  )
}
