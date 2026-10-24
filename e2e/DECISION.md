# 프론트 브라우저 스모크 테스트는 Playwright 로, PR 마다 CI 에서 돌린다

날짜: 2026-10-24. 대상: Frontend (`e2e/`, `playwright.config.ts`, `.github/workflows/ci.yml`)

## 배경

- 2026-10-24 사람이 10분 동안 화면을 눌러 보다가 UI 버그 8개를 찾았다. 자동 시험은 하나도 잡지 못했다.
- 수식 칩 편집기(칩 누르기, 작은 창 열기·취소, 한글 IME 입력)와 정답 칸 동그라미 변환, 발문 줄바꿈(`white-space: pre-line`), 문항 순서·라벨(20-1, 20-2) 흐름에는 시험이 없었다. 기존 Vitest 는 순수 함수와 컴포넌트 일부만 봤다.
- 이런 버그는 실제 브라우저의 배치·CSS·포커스·클릭 순서에서 나온다.

## 결정

- Playwright(chromium 하나)로 스모크 4개를 둔다: 작업 화면 번호판·카드 순서와 라벨, 발문 줄바꿈, 문항 고치기(칩·창·취소·정답 ①·저장 본문), 해설지 보기 수식 렌더링.
- 백엔드는 쓰지 않는다. `page.route` 로 `/api/**` 를 가로채 `e2e/fixtures/job.json` 으로 답한다. 빠르고(4개 약 2초, 로컬) 흔들리지 않는다.
- 가짜 데이터만 쓴다. 실제 학교 시험지 글을 넣지 않는다 (저작권, 공개 저장소 위험). 응답 모양만 `src/shared/api.ts` 타입에서 따온다.
- GitHub Actions `ci.yml`: PR 과 main push 마다 `tsc --noEmit`, `vitest run`, `playwright test`. 실패하면 `playwright-report` 를 올린다.
- Vitest 는 `src/**/*.test.*` 만 줍는다 (e2e 파일을 건드리지 않게).

## 버린 대안

- jsdom + testing-library 만: 실제 배치와 CSS(`white-space`, 포커스, 칩 위치)가 없어 이번에 놓친 종류의 버그를 못 잡는다. 지금 있는 컴포넌트 시험은 그대로 둔다.
- Cypress: Playwright 보다 무겁고(설치·실행), 병렬·여러 브라우저·`page.route` 로 가짜 응답을 다루기에 이점이 없다.
- 실제 백엔드를 띄워 하는 e2e: CI 에서 DB·S3·AI 키가 필요하고 느리다. 스모크 범위를 넘는다. 백엔드 계약은 백엔드 시험이 본다.

## 남은 것

- 한글 IME 조합 입력은 Playwright 로 흉내내기 어렵다 (조합 중 Enter 무시 로직은 사람이 확인). 필요해지면 따로 정한다.
- 새 화면 버그가 나오면 같은 커밋에서 이 스모크에 재현 시험을 더한다.

## 갱신 (2026-10-24, #10)

- main 으로 바로 푸시할 때만 git 훅 `.githooks/pre-push` 가 `tsc --noEmit`, `vitest run`, `test:e2e` 를 돌려 실패하면 푸시를 막는다 (약 15초). 다른 브랜치는 PR CI 가 본다. 사람마다 한 번 `git config core.hooksPath .githooks` 로 켠다. 건너뛰기 `git push --no-verify`.
- 이 저장소는 squash 머지만 허용한다.
