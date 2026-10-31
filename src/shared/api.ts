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
  // 해설 고쳐 달라는 요청을 이미 고쳤는지 (save_revision 뒤 true). 예전 백엔드에는 없다
  revised?: boolean
  keyAnswer?: string | null
  // 학원 작업의 문항 데이터 (items.json, 문항 카드 손 수정용). 문항 뽑기 전·해설지 작업에는 없다
  item?: AcademyItem
}

// 문항 데이터 조각: L 줄, S 배점, B 상자(text 제목, box 상자 줄), T 자료 표(text "행 열 [행,열,행 수,열 수].. [inbox] [noborder]", box 칸 글 행 순서), P 그림
export interface AcademyPart {
  kind: 'L' | 'S' | 'B' | 'T' | 'P'
  text: string
  box: string[]
}
export interface AcademyItem {
  answer: string
  parts: AcademyPart[]
  choices: string[]
}

// 손 수정: 바뀐 것만. stem 해설용 발문 전체, choices 선지 전체(개수 그대로), cells 자료 표 칸, answer 정답
export interface ItemCell {
  part: number
  index: number
  text: string
}
export interface ItemFields {
  stem?: string
  choices?: string[]
  cells?: ItemCell[]
  answer?: string
}

// 보류 결정 (decisions.json 그 문항): ai AI 답, key 정답표 답, edit 직접 고침, revise 해설 고쳐 달라, exclude 문제 제외, replace 변형 문항으로 바꾸기
export type HoldChoice = 'ai' | 'key' | 'edit' | 'revise' | 'exclude' | 'replace'
export interface HoldDecision {
  choice: HoldChoice
  at: string
  answer?: string
  request?: string
  stem?: boolean
  // replace: replaced 바꿈 끝, failed 못 바꾼 사유 (둘 다 없으면 기다림). before(원래 문항)는 서버 기록이라 화면은 읽지 않는다
  replaced?: boolean
  failed?: string
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
  files: { hwp: boolean; hwpx: boolean; academyHwp?: boolean; academyHwpx?: boolean; parts?: DocPart[] }
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

// 현재 XSRF-TOKEN 쿠키 값 (백엔드가 응답마다 심는다)
function csrfCookie(): string | undefined {
  return document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)?.[1]
}

// 로그인이 풀렸을 때 알리는 이벤트 이름 (App 이 받아 로그인 화면으로 보낸다)
export const UNAUTHORIZED_EVENT = 'mmm:unauthorized'

// 모든 /api 호출의 공통 입구: GET 이 아니면 CSRF 헤더를 붙이고, 로그인 밖 401 은 이벤트로 알린다
async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  if (method !== 'GET') {
    // 쿠키가 아직 없으면 GET /api/me 로 먼저 받는다
    if (!csrfCookie()) await fetch('/api/me')
    const token = csrfCookie()
    if (token) headers.set('X-XSRF-TOKEN', decodeURIComponent(token))
  }
  const res = await fetch(url, { ...init, headers })
  if (res.status === 401 && !url.startsWith('/api/auth/') && url !== '/api/me') {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  }
  return res
}

// 로그인한 회원
export interface Me {
  id: number
  email: string
  name: string
}

// 내 정보: 로그인 안 했으면 null
export async function fetchMe(): Promise<Me | null> {
  const res = await apiFetch('/api/me')
  if (res.status === 401) return null
  return handle<Me>(res)
}

export async function signup(input: { email: string; password: string; name: string }): Promise<void> {
  const res = await apiFetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  await handle<unknown>(res)
}

export async function login(email: string, password: string): Promise<Me> {
  const res = await apiFetch('/api/auth/login', { method: 'POST', body: new URLSearchParams({ email, password }) })
  return handle<Me>(res)
}

export async function logout(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' })
}

export async function fetchJobs(): Promise<Job[]> {
  const res = await apiFetch('/api/jobs')
  return handle<Job[]>(res)
}

export async function fetchJob(id: string): Promise<Job> {
  const res = await apiFetch(`/api/jobs/${id}`)
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
  const res = await apiFetch('/api/jobs', { method: 'POST', body: form })
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
  const res = await apiFetch('/api/batches', { method: 'POST', body: form })
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
  const res = await apiFetch(`/api/batches/${id}`)
  return handle<BatchView>(res)
}

// 묶음 실행·중지: 503 키 없음, 409 실행 중(중지는 실행 중 아님)은 백엔드 사유를 그대로 던진다
export async function controlBatch(id: string, action: 'run' | 'cancel'): Promise<void> {
  const res = await apiFetch(`/api/batches/${id}/${action}`, { method: 'POST' })
  await handle<unknown>(res)
}

// 보류 문항 결정: 결정 뒤 작업을 돌려준다. 400 사유(보류 문항이 아님, 빈 입력 등)는 그대로 던진다
export async function decideHold(
  jobId: string,
  no: number,
  body: { choice: HoldChoice; request?: string } & ItemFields,
): Promise<Job> {
  const res = await apiFetch(`/api/jobs/${jobId}/problems/${no}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handle<Job>(res)
}

// 문항 카드 손 수정 (학원 작업, 보류가 아니어도): 고친 뒤 작업을 돌려준다. 400 사유(고친 곳이 없다 등)는 그대로 던진다
export async function editItem(jobId: string, no: number, fields: ItemFields): Promise<Job> {
  const res = await apiFetch(`/api/jobs/${jobId}/problems/${no}/item`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  })
  return handle<Job>(res)
}

export async function deleteJob(id: string): Promise<void> {
  const res = await apiFetch(`/api/jobs/${id}`, { method: 'DELETE' })
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

// 결과 문서에서 따로 받을 수 있는 분류: 문제지, 빠른정답, 해설지
export type DocPart = 'munje' | 'dap' | 'haesol'

// 학원 작업의 결과 문서 (고른 기능이 다 끝난 작업)
export function academyUrl(jobId: string, ext: 'hwp' | 'hwpx' | 'view'): string {
  return ext === 'view' ? `/api/jobs/${jobId}/academy-view.hwp` : `/api/jobs/${jobId}/academy.${ext}`
}

// 고른 분류만 담은 결과 문서. 분류는 문제지, 빠른정답, 해설지 순서로 붙인다
export function academyPartsUrl(jobId: string, parts: DocPart[]): string {
  const keys = (['munje', 'dap', 'haesol'] as const).filter(key => parts.includes(key))
  return `/api/jobs/${encodeURIComponent(jobId)}/academy-parts.hwp?parts=${keys.join(',')}`
}

// 다 풀기 전 지금까지 저장된 풀이로 만든 해설지 (받을 때마다 새로 만든다)
export function haesolDraftUrl(jobId: string, ext: 'hwp' | 'hwpx'): string {
  return `/api/jobs/${jobId}/haesol-draft.${ext}`
}

// 변형문제 정답+해설지 줄 (make_variant_docs 가 만든 variant/haesol.txt, 작업 draft 와 같은 모양). 아직 안 만들었으면 null
export async function fetchVariantLines(jobId: string): Promise<string[] | null> {
  const res = await apiFetch(figureUrl(jobId, 'variant/haesol.txt'))
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
  const res = await apiFetch(figureUrl(jobId, 'variant/munje.json'))
  if (res.status === 404) return null
  if (!res.ok) throw new ApiRequestError(res.status, '변형문제 문제지를 불러오지 못했습니다')
  return (await res.json()) as VariantMunje
}

// 변형문제 다운로드: 학생용 문제지(munje), 정답+해설지(haesol)
export function variantUrl(jobId: string, kind: 'munje' | 'haesol'): string {
  return `/api/jobs/${jobId}/variant-${kind}.hwp`
}
