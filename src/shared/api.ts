// 백엔드 JSON 모양 그대로 옮긴 타입, 필드 이름을 바꾸지 않는다
export type Stage = 'uploaded' | 'problems' | 'figures' | 'solving' | 'done'
export type InputType = 'PDF' | 'HWP' | 'HWPX' | 'HML'

export interface Verification {
  pass: boolean
  reason: string
}

export interface Problem {
  no: number
  label?: string
  printedNo: number | null
  stem: string
  choices: string[]
  figures: string[]
  answer: string | null
  steps: string[]
  verification: Verification | null
  blindAnswer: string | null
  // 강사가 수정 요청(mmm save_revision)으로 고친 문항과 요청 원문. 예전 백엔드에는 없다
  editedByTeacher?: boolean
  editRequests?: string[]
  review: string | null
  revisionCount?: number
  // 해설을 고른 학원 작업에만: 보류 사유(결정까지 덧씌운 해설 판정, 없으면 null), 보류 결정, 정답표 답
  hold?: string | null
  decision?: HoldDecision | null
  keyAnswer?: string | null
}

// 보류 결정 (decisions.json 그 문항): ai AI 답, key 정답표 답, edit 직접 고침, revise 해설 고쳐 달라, exclude 문제 제외
export type HoldChoice = 'ai' | 'key' | 'edit' | 'revise' | 'exclude'
export interface HoldDecision {
  choice: HoldChoice
  at: string
  answer?: string
  request?: string
  stem?: boolean
}

// 학원 시험지 제작: 고른 기능과 진행 (기능을 고른 작업만). extract 문항 뽑기 차례(hwp·hwpx·pdf), haesol 해설 차례, hold 보류(검토 필요), variant 변형 차례, done 결과 문서 있음, failed 결과 문서 실패
export type Feature = 'typing' | 'haesol' | 'variant'
export type Progress = 'extract' | 'haesol' | 'hold' | 'variant' | 'done' | 'failed'
export interface BatchInfo {
  id: string
  name: string
  created: string
  order: number
}

export interface Job {
  id: string
  title: string
  scope: string
  inputType: InputType
  pages: number
  createdAt: string
  sourceName: string
  stage: Stage
  problemCount: number
  solvedCount: number
  reviewCount: number
  // academyHwp·academyHwpx: 결과 문서가 있는 학원 작업에만 온다
  files: { hwp: boolean; hwpx: boolean; academyHwp?: boolean; academyHwpx?: boolean }
  // 기능을 고른 작업에만 온다. batch 는 묶음으로 올린 작업만
  features?: Feature[]
  progress?: Progress
  progressError?: string
  // 변형 단계 실패 사유. progress 는 variant 를 유지하고 다시 실행하면 남은 것부터 진행한다
  variantError?: string
  // 해설을 고른 학원 작업의 보류 문항 수
  holdCount?: number
  batch?: BatchInfo
  problems?: Problem[]
  // 해설지 머리말용 시험 정보. 예전 작업에는 없을 수 있다
  school?: string
  grade?: string
  exam?: string
  range?: string
  header?: string
  // 지금까지 저장된 풀이로 만든 해설지 줄 (haesol_pdf.txt 와 같은 모양). 예전 백엔드에는 없다
  draft?: string[]
  // PDF 에서 뺀 정답표 쪽(원본 쪽 번호)과 글자층 유무(false 면 스캔본). 예전 백엔드에는 없다
  answerPages?: number[]
  textLayer?: boolean
}

// 백엔드 400 응답 모양
export interface ApiError {
  error: string
}

class ApiRequestError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// 공통 에러 처리: 400 사유 그대로, 404 는 없는 작업
async function handle<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>
  if (res.status === 404) throw new ApiRequestError(404, '없는 작업입니다')
  const body = (await res.json().catch(() => null)) as ApiError | null
  throw new ApiRequestError(res.status, body?.error ?? '요청에 실패했습니다')
}

export async function fetchJobs(): Promise<Job[]> {
  const res = await fetch('/api/jobs')
  return handle<Job[]>(res)
}

export async function fetchJob(id: string): Promise<Job> {
  const res = await fetch(`/api/jobs/${id}`)
  return handle<Job>(res)
}

export interface CreateJobInput {
  file: File
  title: string
  scope: string
  pages?: string
  school: string
  grade: string
  exam: string
  range: string
  features?: Feature[]
}

export async function createJob(input: CreateJobInput): Promise<{ id: string }> {
  const form = new FormData()
  form.set('file', input.file)
  form.set('title', input.title)
  form.set('scope', input.scope)
  if (input.pages) form.set('pages', input.pages)
  form.set('school', input.school)
  form.set('grade', input.grade)
  form.set('exam', input.exam)
  form.set('range', input.range)
  if (input.features) form.set('features', input.features.join(','))
  const res = await fetch('/api/jobs', { method: 'POST', body: form })
  return handle<{ id: string }>(res)
}

// 묶음으로 올릴 시험지 하나의 입력 (파일과 같은 순서). pages 는 PDF 쪽 범위, range 는 hml 이 아닌 시험지의 시험 범위
export interface BatchItem {
  title: string
  scope: string
  pages: string
  school: string
  grade: string
  exam: string
  range: string
  features: Feature[]
}

// 묶음 올리기 응답: 거부된 시험지는 errors 에 파일별 사유
export interface BatchCreated {
  id: string
  jobs: string[]
  errors: { file: string; error: string }[]
}

export async function createBatch(files: File[], name: string, items: BatchItem[]): Promise<BatchCreated> {
  const form = new FormData()
  files.forEach(file => form.append('files', file))
  form.set('name', name)
  form.set('items', JSON.stringify(items))
  const res = await fetch('/api/batches', { method: 'POST', body: form })
  return handle<BatchCreated>(res)
}

// API 버전 묶음 실행 상태 (서버 메모리, 재시작하면 idle)
export interface BatchRun {
  state: 'idle' | 'running' | 'done' | 'failed' | 'cancelled'
  current?: string | null
  error?: string | null
}

export interface BatchView {
  id: string
  name: string
  created: string
  jobs: Job[]
  run: BatchRun
}

export async function fetchBatch(id: string): Promise<BatchView> {
  const res = await fetch(`/api/batches/${id}`)
  return handle<BatchView>(res)
}

// 묶음 실행·중지: 503 키 없음, 409 실행 중(중지는 실행 중 아님)은 백엔드 사유를 그대로 던진다
export async function controlBatch(id: string, action: 'run' | 'cancel'): Promise<void> {
  const res = await fetch(`/api/batches/${id}/${action}`, { method: 'POST' })
  await handle<unknown>(res)
}

// 보류 문항 결정: 결정 뒤 작업을 돌려준다. 400 사유(보류 문항이 아님, 빈 입력 등)는 그대로 던진다
export async function decideHold(
  jobId: string,
  no: number,
  body: { choice: HoldChoice; stem?: string; answer?: string; request?: string },
): Promise<Job> {
  const res = await fetch(`/api/jobs/${jobId}/problems/${no}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handle<Job>(res)
}

export async function deleteJob(id: string): Promise<void> {
  const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) {
    throw new ApiRequestError(res.status, '삭제에 실패했습니다')
  }
}

// 그림·원본 쪽 이미지 URL 헬퍼
export function figureUrl(jobId: string, path: string): string {
  return `/api/jobs/${jobId}/files?path=${encodeURIComponent(path)}`
}

export function pageImageUrl(jobId: string, page: number): string {
  return `/api/jobs/${jobId}/pages/${page}.png`
}

export function haesolUrl(jobId: string, ext: 'hwp' | 'hwpx'): string {
  return `/api/jobs/${jobId}/haesol.${ext}`
}

// 학원 작업의 결과 문서 (고른 기능이 다 끝난 작업)
export function academyUrl(jobId: string, ext: 'hwp' | 'hwpx'): string {
  return `/api/jobs/${jobId}/academy.${ext}`
}

// 다 풀기 전 지금까지 저장된 풀이로 만든 해설지 (받을 때마다 새로 만든다)
export function haesolDraftUrl(jobId: string, ext: 'hwp' | 'hwpx'): string {
  return `/api/jobs/${jobId}/haesol-draft.${ext}`
}

// 변형문제 정답+해설지 줄 (make_variant_docs 가 만든 variant/haesol.txt, 작업 draft 와 같은 모양). 아직 안 만들었으면 null
export async function fetchVariantLines(jobId: string): Promise<string[] | null> {
  const res = await fetch(figureUrl(jobId, 'variant/haesol.txt'))
  if (res.status === 404) return null
  if (!res.ok) throw new ApiRequestError(res.status, '변형문제를 불러오지 못했습니다')
  return (await res.text()).replace(/\s+$/, '').split(/\r?\n/)
}

// 변형문제 학생용 문제지 (make_variant_docs 가 만든 variant/munje.json). long 이면 단 전체(2칸)를 쓴다. 아직 안 만들었으면 null
// parts: 발문 조각 ({text} 한 줄, {box, title} <보기>·조건 상자. 판정은 백엔드 MunjeWriter.parts). 예전 파일엔 없다
export type MunjePart = { text: string } | { box: string[]; title: string }

export interface VariantMunje {
  title: string
  items: { label: string; stem: string; parts?: MunjePart[]; choices: string[]; long: boolean }[]
}

export async function fetchVariantMunje(jobId: string): Promise<VariantMunje | null> {
  const res = await fetch(figureUrl(jobId, 'variant/munje.json'))
  if (res.status === 404) return null
  if (!res.ok) throw new ApiRequestError(res.status, '변형문제 문제지를 불러오지 못했습니다')
  return (await res.json()) as VariantMunje
}

// 변형문제 다운로드: 학생용 문제지(munje), 정답+해설지(haesol)
export function variantUrl(jobId: string, kind: 'munje' | 'haesol'): string {
  return `/api/jobs/${jobId}/variant-${kind}.hwp`
}
