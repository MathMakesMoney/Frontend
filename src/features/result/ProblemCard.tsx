import { labelText } from '../../shared/labelText'
import { RichText } from '../../shared/RichText'
import { figureUrl, type Problem } from '../../shared/api'
import { ReviseRequest } from './ReviseRequest'

// 문항 한 개: 검토 필요면 사유를 그대로 보여 주고 정답처럼 보이지 않게 한다
export function ProblemCard({ jobId, problem }: { jobId: string; problem: Problem }) {
  const needsReview = problem.review !== null
  // 백엔드가 정한 표시 번호 (겹치면 20-1, 번호 없으면 2-1)
  const label = labelText(problem.label ?? problem.no)

  return (
    <article className={`problem-card${needsReview ? ' needs-review' : ''}`}>
      <header className="problem-header">
        <span className="problem-no">{label}</span>
        {needsReview && <span className="review-badge">검토 필요: {problem.review}</span>}
        {problem.editedByTeacher && <span className="edited-badge">강사 수정</span>}
      </header>

      <p className="problem-stem">
        <RichText text={problem.stem} />
      </p>

      {problem.choices.length > 0 && (
        <ol className="choices">
          {problem.choices.map((choice, i) => (
            <li key={i}>
              <RichText text={choice} />
            </li>
          ))}
        </ol>
      )}

      {problem.figures.length > 0 && (
        <div className="figures">
          {problem.figures.map((path) => (
            <img key={path} src={figureUrl(jobId, path)} alt="문항 그림" />
          ))}
        </div>
      )}

      <div className="answer-row">
        <span className="field-label">정답</span>
        <span className={needsReview ? 'answer-unconfirmed' : 'answer'}>
          {problem.answer ? <RichText text={problem.answer} /> : '(없음)'}
          {needsReview && ' (미확정)'}
        </span>
      </div>

      {problem.steps.length > 0 && (
        <div className="steps">
          <span className="field-label">풀이</span>
          <ol>
            {problem.steps.map((step, i) => (
              <li key={i}>
                <RichText text={step} />
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="verification-row">
        <span className="field-label">독립 검증 답</span>
        <span>{problem.blindAnswer ? <RichText text={problem.blindAnswer} /> : '(없음)'}</span>
      </div>

      {problem.verification && (
        <div className="verification-row">
          <span className="field-label">검증 결과</span>
          <span className={problem.verification.pass ? 'pass' : 'fail'}>
            {problem.verification.pass ? '통과' : `실패: ${problem.verification.reason}`}
          </span>
        </div>
      )}

      {!!problem.revisionCount && problem.revisionCount > 0 && (
        <p className="hint">다시 저장 {problem.revisionCount}번</p>
      )}
      <ReviseRequest jobId={jobId} label={label} requests={problem.editRequests ?? []} />
    </article>
  )
}
