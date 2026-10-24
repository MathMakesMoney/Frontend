import { useState } from 'react'
import { decideHold, type HoldChoice, type HoldDecision, type Job, type Problem } from '../../shared/api'
import { labelText } from '../../shared/labelText'
import { RichText } from '../../shared/RichText'
import { ItemEditor } from './ItemEditor'

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

const REVISE_HINT = 'AI 연결 대화창에서 이어 하거나 묶음 실행을 다시 누르면 이 문항을 고쳐요'

// 보류 작업의 보류 문항 목록: 사유, AI 답, 독립 검증 답, 정답표 답과 다섯 선택지. 결정하면 새 작업을 onDecided 로 넘긴다
// 해설 고쳐 달라는 요청이 남아 해설 차례로 돌아간 작업도 보여 결정을 바꿀 수 있다 (백엔드 결정 043)
export function HoldPanel({ job, onDecided }: { job: Job; onDecided: (job: Job) => void }) {
  const revising = job.progress === 'haesol' && (job.problems ?? []).some(p => p.decision?.choice === 'revise')
  if (job.progress !== 'hold' && !revising) return null
  const holds = (job.problems ?? []).filter(p => p.hold)
  return (
    <section className="hold-panel" aria-label="보류 문항 결정">
      <h2>보류 문항 {holds.length}개</h2>
      <p className="hint">문항마다 하나를 고르면 결과 문서에 반영돼요. 모두 정하면 결과 문서를 다시 만들어요</p>
      {revising && <p className="hint">해설 고쳐 달라는 요청이 남았어요. {REVISE_HINT}</p>}
      {holds.map(p => <HoldItem key={p.no} jobId={job.id} problem={p} cells={job.inputType === 'HML'} onDecided={onDecided} />)}
    </section>
  )
}

// cells: hml 문항이면 자료 표를 칸마다 고친다 (AI 로 뽑은 문항은 발문의 표 줄에서)
function HoldItem({ jobId, problem, cells, onDecided }: { jobId: string; problem: Problem; cells: boolean; onDecided: (job: Job) => void }) {
  const [open, setOpen] = useState<'edit' | 'revise' | null>(null)
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
      {/* 직접 고치기는 문항 카드 손 수정과 같은 편집기. 저장하면 결정(edit)으로 남는다 */}
      {open === 'edit' && (
        <ItemEditor problem={problem} answer={problem.keyAnswer ?? ''} answerLabel="정답 (고치면 이 답으로 정해요)" cells={cells}
          onSave={async fields => onDecided(await decideHold(jobId, problem.no, { choice: 'edit', ...fields }))} />
      )}
      {open === 'revise' && (
        <div className="revise-box">
          <label htmlFor={`hold-request-${problem.no}`}>어떻게 고칠까요? ({REVISE_HINT})</label>
          <textarea id={`hold-request-${problem.no}`} rows={2} value={request} onChange={e => setRequest(e.target.value)} />
          <button type="button" className="button" disabled={busy || !request.trim()} onClick={() => decide({ choice: 'revise', request })}>요청 저장</button>
        </div>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </article>
  )
}
