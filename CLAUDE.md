# CLAUDE.md

수학은 돈이된다 (MathMakesMoney) 프론트엔드. 강사가 시험지(HWPX, HWP, PDF)를 올리고, 작업 진행을 보고, 문항별 풀이를 확인·수정한 뒤 HWP/HWPX 해설지를 받는 웹사이트.

- 원문: 노션 PRD `3e7d5061-49b7-80a0-88b0-fe3d067c83be`
- 백엔드 사양이 기준이다: `../Backend/CLAUDE.md` 와 각 컨텍스트 CLAUDE.md. API 모양은 `../Backend/src/main/java/com/mathmakesmoney/backend/job/presentation/CLAUDE.md`, `account/CLAUDE.md`
- 세부 사양은 각 폴더의 CLAUDE.md. 작업하는 폴더와 그 위 폴더의 CLAUDE.md 를 먼저 읽는다
- 백엔드 문서와 다르게 만들어야 하면 멋대로 바꾸지 말고 먼저 묻는다. API 가 바뀌면 백엔드 문서도 같이 고친다

## 기술 스택 (결정)

| 항목 | 결정 |
|---|---|
| 프레임워크 | React + TypeScript + Vite |
| 서버 상태 | TanStack Query (작업 상세는 완료 전까지 5초 폴링) |
| 라우팅 | React Router |
| 스타일 | 일반 CSS 한 파일 (`src/styles.css`), 프레임워크 없음 |
| 테스트 | Vitest (수식 나누기 등 순수 로직만, PoC 단계라 Playwright e2e는 아직 없음) |
| 수식 표시 | 한글 수식 스크립트를 `src/shared/hwpeq.ts` 로 LaTeX 로 바꾼 뒤 KaTeX 로 그린다. 실패하면 원문 칩 (`src/shared/CLAUDE.md`) |
| 배포 | 미정. 로컬 개발은 Vite dev 서버 프록시로 `/api`, `/mcp` 를 백엔드(8080)로 넘긴다 |

- 로그인, 결제, AI API 실행 버튼은 이번 PoC 범위 밖 (MCP 버전만 검증)

### 명령

- `npm install`
- `npm run dev`: 개발 서버 (5173), `/api`, `/mcp` 는 `http://localhost:8080` 으로 프록시
- `npm run build`: 타입 체크 + `dist/` 로 빌드
- `npm test`: Vitest 실행
- `npm run preview`: 빌드 결과 미리보기

## 폴더 구조 (기능별)

```
src
├ shared            API 호출, 수식 표시(<<EQ>>), 공통 컴포넌트
└ features
  ├ account         로그인, 내 정보, 요금제·크레딧, 사용량
  ├ upload          작업 만들기 (파일, 제목, 교과 범위, 쪽 범위, 버전)
  ├ jobs            작업 목록, 진행 단계, 실행·이어서·중지·삭제
  ├ result          문항별 결과 확인·수정, 검토 필요, 다시 풀기, 다운로드
  └ mcp             MCP 버전 안내, 대화창에 붙일 문장 복사
```

- 기능 폴더끼리 직접 import 하지 않는다. 같이 쓰는 것은 `shared` 로 올린다
- 백엔드 컨텍스트와 1:1 이 아니다. 화면 단위로 나눈다

## 화면 흐름

1. 로그인 -> 작업 목록
2. 작업 만들기 (업로드) -> 작업 상세로 이동
3. AI API 버전: 실행 버튼 -> 단계 진행 표시 (보통 10~30분, 폴링). MCP 버전: 대화창 문장 복사 안내
4. 완료 -> 문항별 결과 (검토 필요 문항 먼저 보이게) -> 수정 -> HWP/HWPX 다운로드

## 반드시 지킬 규칙

- 검토 필요 문항은 정답처럼 보이게 하지 않는다. 사유를 그대로 보여 주고, 해제는 강사가 직접 누를 때만 (`reviewResolved=true`). 자동 해제 금지
- 수식은 LaTeX 가 아니라 한글 수식 스크립트다. 원문을 KaTeX 에 그대로 넣지 않고, 반드시 `hwpeq.ts` 로 바꾼 뒤 그린다 (`src/shared/CLAUDE.md`)
- 판정·정규화·후처리는 백엔드 일이다. 프론트에서 답 비교, 검토 판정, 조판 후처리를 다시 구현하지 않는다
- 다른 회원 작업은 404 로 온다. 없는 작업과 같은 화면으로 처리한다
- 쓰는 말은 강사 눈높이 한국어 (해설지, 문항, 검토 필요). 내부 용어(stage, blind, typesetting)는 화면에 내보내지 않는다

## 정해지지 않은 것 (백엔드와 같이 정함)

- 로그인 방식 (추천: 카카오 + 이메일, 세션 쿠키)
- 결제 화면 (PG 미정, 요금 금액 미정)
- 작업 상태 실시간 방식 (추천: 폴링. SSE 는 필요해지면)

## 문서 규칙

- 폴더별 지식은 그 폴더 CLAUDE.md 에, 전체 결정·규칙은 이 파일에. 한 파일 100줄 안쪽을 지키고 넘으면 하위 폴더로 나눈다
- 문서 속 경로는 Frontend 루트 기준 (`../Backend/...` 는 백엔드 레포)
- 새 결정은 근거와 함께 적는다. 백엔드에 이미 있는 사실은 복사하지 말고 파일 경로로 가리킨다
