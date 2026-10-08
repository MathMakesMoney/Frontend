// 백엔드 JSON 모양 그대로 옮긴 타입, 필드 이름을 바꾸지 않는다
export type Stage = 'uploaded' | 'problems' | 'figures' | 'solving' | 'done'
export type InputType = 'PDF' | 'HWP' | 'HWPX'

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
  files: { hwp: boolean; hwpx: boolean }
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
  const res = await fetch('/api/jobs', { method: 'POST', body: form })
  return handle<{ id: string }>(res)
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
