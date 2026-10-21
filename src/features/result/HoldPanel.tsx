import { useState } from 'react'
import { decideHold, type HoldChoice, type HoldDecision, type Job, type Problem } from '../../shared/api'
import { labelText } from '../../shared/labelText'
import { RichText } from '../../shared/RichText'

const CHOICE_LABEL: Record<HoldChoice, string> = {
  ai: 'AI 답으로 정하기',
  key: '정답표 답으로 정하기',
  edit: '발문·정답 직접 고치기',
  revise: '해설 고쳐 달라고 하기',
  exclude: '문제 제외하기',
}

// 이미 내린 결정을 강사 말로 (문항 카드 표시에도 쓴다)
export function decisionText(decision: HoldDecision): string {
  switch (decision.choice) {
    case 'ai': return 'AI 답으로 정함'
    case 'key': return '정답표 답으로 정함'
    case 'edit': return '발문·정답 직접 고침'
    case 'revise': return `해설 고쳐 달라고 함: ${decision.request ?? ''}`
    case 'exclude': return '문제 제외'
  }
}

// 직접 고치기: 바뀐 것만 보낸다 (안 바뀐 발문을 보내면 서버가 '고친 곳이 없다' 로 거절)
export function editedFields(stem: string, answer: string, newStem: string, newAnswer: string): { stem?: string; answer?: string } {
  const out: { stem?: string; answer?: string } = {}
  if (newStem !== stem) out.stem = newStem
  if (newAnswer.trim() && newAnswer.trim() !== answer) out.answer = newAnswer.trim()
  return out
}

// 보류 작업의 보류 문항 목록: 사유, AI 답, 독립 검증 답, 정답표 답과 다섯 선택지. 결정하면 새 작업을 onDecided 로 넘긴다
export function HoldPanel({ job, onDecided }: { job: Job; onDecided: (job: Job) => void }) {
  if (job.progress !== 'hold') return null
  const holds = (job.problems ?? []).filter(p => p.hold)
  return (
    <section className="hold-panel" aria-label="보류 문항 결정">
      <h2>보류 문항 {holds.length}개</h2>
      <p className="hint">문항마다 하나를 고르면 결과 문서에 반영돼요. 모두 정하면 결과 문서를 다시 만들어요</p>
      {holds.map(p => <HoldItem key={p.no} jobId={job.id} problem={p} onDecided={onDecided} />)}
    </section>
  )
}

function HoldItem({ jobId, problem, onDecided }: { jobId: string; problem: Problem; onDecided: (job: Job) => void }) {
  const [open, setOpen] = useState<'edit' | 'revise' | null>(null)
  const [stem, setStem] = useState(problem.stem)
  const [answer, setAnswer] = useState(problem.keyAnswer ?? '')
  const [request, setRequest] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function decide(body: Parameters<typeof decideHold>[2]) {
    setBusy(true)
    setError('')
    try {
      onDecided(await decideHold(jobId, problem.no, body))
    } catch (e) {
      setError(e instanceof Error ? e.message : '결정을 저장하지 못했어요')
    } finally {
      setBusy(false)
    }
  }

  const label = labelText(problem.label ?? problem.no)
  const answerOf = (text: string | null | undefined) => (text ? <RichText text={text} /> : '(없음)')
  return (
    <article className="hold-item">
      <header className="problem-header">
        <span className="problem-no">{label}</span>
        <span className="review-badge">검토 필요: {problem.hold}</span>
        {problem.decision && <span className="edited-badge">{decisionText(problem.decision)}</span>}
      </header>
      <dl className="hold-answers">
        <dt>AI 답</dt><dd>{answerOf(problem.answer)}</dd>
        <dt>독립 검증 답</dt><dd>{answerOf(problem.blindAnswer)}</dd>
        <dt>정답표 답</dt><dd>{answerOf(problem.keyAnswer)}</dd>
      </dl>
      <div className="hold-choices">
        <button type="button" className="button" disabled={busy} onClick={() => decide({ choice: 'ai' })}>{CHOICE_LABEL.ai}</button>
        <button type="button" className="button" disabled={busy} onClick={() => decide({ choice: 'key' })}>{CHOICE_LABEL.key}</button>
        <button type="button" className="button-plain" disabled={busy} onClick={() => setOpen(open === 'edit' ? null : 'edit')}>{CHOICE_LABEL.edit}</button>
        <button type="button" className="button-plain" disabled={busy} onClick={() => setOpen(open === 'revise' ? null : 'revise')}>{CHOICE_LABEL.revise}</button>
        <button type="button" className="button-plain" disabled={busy} onClick={() => decide({ choice: 'exclude' })}>{CHOICE_LABEL.exclude}</button>
      </div>
      {open === 'edit' && (
        <div className="revise-box">
          <label htmlFor={`hold-stem-${problem.no}`}>발문 (줄 수는 그대로, 표·그림 줄은 못 고쳐요. 발문을 고치면 이 문항을 다시 풀어요)</label>
          <textarea id={`hold-stem-${problem.no}`} rows={4} value={stem} onChange={e => setStem(e.target.value)} />
          <label htmlFor={`hold-answer-${problem.no}`}>정답 (고치면 이 답으로 정해요)</label>
          <input id={`hold-answer-${problem.no}`} value={answer} onChange={e => setAnswer(e.target.value)} />
          <button type="button" className="button" disabled={busy} onClick={() => {
            const fields = editedFields(problem.stem, problem.keyAnswer ?? '', stem, answer)
            if (!fields.stem && !fields.answer) setError('고친 곳이 없어요')
            else decide({ choice: 'edit', ...fields })
          }}>고친 내용 저장</button>
        </div>
      )}
      {open === 'revise' && (
        <div className="revise-box">
          <label htmlFor={`hold-request-${problem.no}`}>어떻게 고칠까요? (AI 연결 대화창에서 다음에 이 문항을 고쳐요)</label>
          <textarea id={`hold-request-${problem.no}`} rows={2} value={request} onChange={e => setRequest(e.target.value)} />
          <button type="button" className="button" disabled={busy || !request.trim()} onClick={() => decide({ choice: 'revise', request })}>요청 저장</button>
        </div>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </article>
  )
}
