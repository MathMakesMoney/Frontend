# jobs (작업 목록과 진행)

작업 목록, 작업 상세의 단계 진행, 실행·이어서·중지·삭제. (F12) 기준: `../Backend/.../job/CLAUDE.md`, `job/presentation/CLAUDE.md`

## API

- `GET /api/jobs`: 목록 (최신순, 페이지)
- `GET /api/jobs/{id}` -> `{"id", "title", "status", "mode", "stages": [{"name", "status", "error"}], "problemCount", "reviewCount", "usage": {"inputTokens", "outputTokens", "costUsd"}}`
- `POST /api/jobs/{id}/run`: 실행 시작, 또는 실패 단계부터 이어서 (AI API 버전만). 크레딧 부족 402
- `POST /api/jobs/{id}/cancel`, `DELETE /api/jobs/{id}`

## 상태

- 작업: 대기 -> 실행 중 -> 완료 / 실패. 완료여도 `reviewCount` 가 0 이 아니면 목록에서 눈에 띄게
- 단계: 대기, 실행 중, 완료, 실패(사유). 실패 단계 사유를 보여 주고 이어서 버튼을 둔다
- 단계 이름은 강사 말로 바꿔 보여 준다: 원문 읽기, 문항 뽑기, 조판 정리, 그림 자르기(PDF), 번호 정리, 풀이·검증, 독립 검증, 검토 판정, 해설지 만들기

## 진행 표시

- 보통 10~30분, 시험지마다 다르다 (수능·모평 PDF 10~15분, 고1 학평 30분 이상, 작업이 겹치면 더 길어짐). 시작할 때 범위로 알려 준다
- 완료 알림(이메일 또는 브라우저 알림)을 둔다 (방식 미정)
- 폴링: 실행 중일 때만, 5초 간격 제안. 완료·실패·화면 떠나면 멈춘다
- 창을 닫아도 서버에서 계속 돈다고 안내 (비동기 실행)
- AI API 요금제는 `usage.costUsd` 를 보여 준다. 비용도 시험지마다 다르다 (수능급 약 1.5~1.8 USD, 고1 약 3.8 USD). 크레딧 예상 차감을 보여 줄 때 한 값으로 단정하지 않는다

## MCP 버전 작업

- 실행 버튼 대신 대화창에 붙일 문장과 복사 버튼 (`src/features/mcp/`)
- 단계 상태는 사용자 모델이 도구로 저장한 만큼 채워진다. 같은 상태 화면을 쓴다

## HML 작업

- 실행·MCP 안내 없이 업로드 때 끝난다(`done`). 목록 표지는 글자 표지, 내려받기는 작업 상세 (`src/features/result/CLAUDE.md` 다운로드)

## 삭제·중지

- 삭제는 파일까지 지워 되돌릴 수 없다. 확인을 한 번 받는다

## 학원 시험지 진행·묶음 (사이트 2단계)

- 작업 응답의 `features`, `progress`(haesol 해설 차례, hold 보류, variant 변형 차례, done 완료, failed 실패), `progressError`, `batch` {id, name, created, order} 는 기능을 고른 hml 작업에만 온다. 강사 말로: 해설 진행 중, 보류 · 검토 필요, 변형 진행 중, 완료, 실패(+사유) (`shared/ProgressStatus.tsx`, `shared/stage.ts`)
- 목록 상태 묶음(업로드·진행 중·완료)은 `progress` 가 있으면 그것으로 가른다 (`jobPhase`). hml 은 `stage` 가 늘 `done` 이라 stage 로는 진행을 못 가른다
- 목록은 `batch.id` 로 묶어 묶음 이름과 `묶음 화면` 링크 아래 시험지 순서(`batch.order`)대로 보이고 (`groupBatches`), 묶음 아닌 작업만 기존 상태별 묶음·최근 작업으로 나뉜다
- 묶음 화면 `/batches/:id` (`BatchPage.tsx`): `GET /api/batches/{id}` 의 작업 목록·진행·결과 문서 내려받기, API 실행·중지(`POST /api/batches/{id}/run|cancel`, 503 키 없음·409 실행 중은 백엔드 사유를 그대로 보임, `run.state` 가 running 일 때만 5초 폴링), MCP 문장 복사(`묶음 N 처리해줘 ... get_batch 부터`, `mcpBatchPrompt`)와 연결 명령(`McpGuide`)
- 보류 결정(3단계)은 작업 상세에서 한다 (`src/features/result/CLAUDE.md` 보류 결정). 목록의 `검토 필요 N` 은 학원 작업이면 보류일 때의 `holdCount`(결정하면 줄고 done 이면 사라짐), 그 밖은 `reviewCount`. 묶음 화면은 `progress` 로 보류·완료가 바뀐다
