import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { controlBatch, fetchBatch, type BatchRun } from '../../shared/api'
import { mcpBatchPrompt } from '../../shared/mcpCommand'
import { featureText } from '../../shared/stage'
import { ProgressStatus } from '../../shared/ProgressStatus'
import { AcademyDownloads } from '../result/AcademyDownloads'
import { McpGuide } from '../mcp/McpGuide'

const RUN_TEXT: Record<BatchRun['state'], string> = {
  idle: '아직 실행하지 않았어요',
  running: '진행 중',
  done: '끝났어요',
  failed: '멈췄어요',
  cancelled: '중지했어요',
}

// 묶음 화면: 시험지별 상태, MCP 문장, API 실행·중지, 결과 문서 내려받기
export function BatchPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)
  const { data: batch, isLoading, error } = useQuery({
    queryKey: ['batch', id],
    queryFn: () => fetchBatch(id!),
    enabled: !!id,
    retry: false,
    refetchInterval: query => (query.state.data?.run.state === 'running' ? 5000 : false),  // 실행 중일 때만 5초 간격
  })
  const control = useMutation({
    mutationFn: (action: 'run' | 'cancel') => controlBatch(id!, action),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['batch', id] }),
  })

  if (isLoading) return <div className="page">불러오는 중...</div>
  if (error || !batch) return <div className="page">없는 묶음입니다</div>

  const running = batch.run.state === 'running'
  const sentence = mcpBatchPrompt(window.location.origin, batch.id, batch.name)
  const current = batch.jobs.find(job => job.id === batch.run.current)

  async function copySentence() {
    try {
      await navigator.clipboard.writeText(sentence)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="page jobs-page batch-page">
      <Link to="/jobs" className="batch-back">← 작업 목록</Link>
      <h1>{batch.name} <span className="batch-count">{batch.jobs.length}</span></h1>

      <ul className="batch-jobs">
        {batch.jobs.map(job => (
          <li key={job.id}>
            <Link to={`/jobs/${job.id}`} className="batch-job-title">{job.title}</Link>
            {job.features && <span className="job-features">{featureText(job.features)}</span>}
            <ProgressStatus job={job} />
            <span className="batch-job-files"><AcademyDownloads jobId={job.id} files={job.files} /></span>
          </li>
        ))}
      </ul>

      <section className="batch-run" aria-label="묶음 실행">
        <h2>풀이담 AI로 진행</h2>
        <p className="hint">상태: {RUN_TEXT[batch.run.state]}{running && current ? ` · ${current.title}` : ''}</p>
        {batch.run.state === 'failed' && batch.run.error && <p className="error">{batch.run.error}</p>}
        <div className="batch-run-actions">
          <button type="button" className="button" disabled={running || control.isPending} onClick={() => control.mutate('run')}>실행</button>
          <button type="button" className="button-plain" disabled={!running || control.isPending} onClick={() => control.mutate('cancel')}>중지</button>
        </div>
        {control.isError && <p className="error" role="alert">{control.error.message}</p>}
      </section>

      <section className="batch-mcp" aria-label="개인 AI로 진행">
        <h2>개인 AI 연결(MCP)로 진행</h2>
        <p className="hint">대화창에 아래 문장을 붙여넣으면 AI가 시험지를 차례로 처리해요. 끊겨도 같은 문장으로 남은 것부터 이어져요</p>
        <p className="batch-sentence">{sentence}</p>
        <button type="button" className="button" onClick={copySentence}>{copied ? '복사 완료 ✓' : '문장 복사'}</button>
        <McpGuide prompt={sentence} />
      </section>
    </div>
  )
}
