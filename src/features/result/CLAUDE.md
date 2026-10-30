# result (문항별 결과)

문항별 풀이 확인·수정, 검토 필요 처리, 한 문항 다시 풀기, 해설지 다운로드. (F4~F9, F11) 기준: `../Backend/.../job/presentation/CLAUDE.md`, `solution/domain/review/CLAUDE.md`

## API

- `GET /api/jobs/{id}/problems` -> `[{"no", "printedNo", "stem", "choices", "figures", "answer", "steps", "verification": {"pass", "reason"}, "blindAnswer", "review": ["사유"], "typesetting": {"outside", "hangulInEq", "unbalanced"}, "editedByTeacher", "revisionCount", "model"}]`. `answer` 는 풀이 누락이면 null
- `PATCH /api/jobs/{id}/problems/{no}`: `{"stem"?, "choices"?, "answer"?, "steps"?, "reviewResolved"?}`
- `POST /api/jobs/{id}/problems/{no}/rerun`: 그 문항만 풀이 -> 검증 -> 독립 검증 -> 판정 다시
- `PUT /api/jobs/{id}/problems/{no}/item` (학원 작업 문항 손 수정, `shared/api.ts` 의 `editItem`): `{stem?, choices?, cells?: [{part, index, text}], answer?}` 바뀐 것만 -> 새 작업. 학원 작업 문항에는 `item`(문항 데이터 조각·선지·정답)이 온다. 모양은 `../Backend/.../job/presentation/CLAUDE.md`
- `GET /api/jobs/{id}/pages/{page}.png`: 원본 쪽 이미지 (150dpi, PDF)
- `GET /api/jobs/{id}/files?path=source.hwpx` 또는 `source.hwp`: 한글 입력의 원본 파일 (어느 쪽인지는 `inputType`)
- 작업 JSON 의 `draft`: 지금까지 저장된 풀이로 만든 해설지 줄 (`haesol_pdf.txt` 와 같은 모양, 푼 문항만)
- `GET /api/jobs/{id}/events` (SSE): MCP 도구가 불릴 때마다 `changed` 이벤트. 받으면 작업을 다시 받는다. 5초 폴링은 뺐다 (끊기면 EventSource 가 다시 붙는다)
- 다운로드: `haesol.hwp`, `haesol.hwpx`, (HWP 입력) `source.hwpx`, (F9) `problems.hwp`, `problems.hwpx`

## 화면

- 목록: 문항을 다 펼치면 너무 길어(22문항 약 9000px) 한 번에 한 문항만 보인다 (`ProblemBrowser.tsx`). 오른쪽 번호판(스크롤해도 따라옴, 좁은 화면은 위)에서 번호를 누르면 그 문항. 번호판은 문항 순서, 검토 필요 번호는 경고 색, 처음엔 첫 검토 필요 문항(없으면 첫 문항). 제목 옆에 검토 필요 개수. 번호판·카드의 번호는 백엔드 `label`(겹치면 20-1, 객관식과 서술형이 번호를 나눠 쓰면 서술형은 `서술형 1`)이고 서술형은 번호판에서 `서1` 로 줄여 보인다 (`shared/labelText.ts`). 번호는 `printedNo` 를 보이고, 밀린 번호(`no` != `printedNo`)면 둘 다 보인다
- 문항 한 개: 발문, 선지, 그림, 답, 풀이 줄, 검증 결과, 독립 검증 답, 검토 사유, 조판 위반 수치
- `answer` 가 null 이면(풀이 누락) 빈 답으로 보이고 검토 사유 `풀이 누락` 을 같이 보인다. 풀이(`answer`, `steps`)가 없으면 `이 해설 고쳐 달라고 하기` 링크는 숨긴다(고칠 해설이 없다). 해설지에도 빈 값으로 나간다
- 원본 시험지: 기본은 접어 둔다 (2026-09-29 요청, 쪽이 많으면 화면이 길고 그리는 데 오래 걸림). PDF 는 쪽 이미지, HWP·HWPX 는 원본 파일을 `@rhwp/core` 로 쪽마다 SVG 로 그린다. WASM 은 펼칠 때만 불러온다. 한글이 저장한 원본은 줄 배치 정보가 있어 잘 그려진다 (광덕고 HWP·HWPX 7쪽, 수식·그림 정상. `BOX`, `!=` 같은 일부 수식 명령은 글자 그대로 나온다)
- 결과 문서 보기 (`AcademyPreview.tsx`, 2026-10-23): `files.academyHwp` 가 있는 작업에만. 미리보기 사본 `/api/jobs/{id}/academy-view.hwp` 를 원본 시험지와 같은 `HwpPages`(`OriginalPages.tsx`, `@rhwp/core`)로 쪽마다 그리고 `reflow` 로 `reflowLinesegs()` 를 부르고, 칸 속 상자(<보기>) 문단은 `reflowNestedCells` 가 글자 하나를 넣었다 지워 다시 계산하게 하며, 1.5배 넘게 가로로 늘어난 수식은 `unstretchEquations` 가 제 크기로 그린다. 내려받는 academy.hwp 를 그대로 그리면 쪽 순서가 바뀌고 긴 발문이 칸 끝에서 잘렸다 (`../Backend/docs/design-docs/failures/040-academy-preview-rhwp-layout.md`, 상자·수식은 `050-academy-preview-box-lines.md`). 접어 두고 처음 펼칠 때만 WASM·파일을 부른다. 작업을 다시 받을 때마다(SSE `changed`, 보류 결정) `dataUpdatedAt` 을 key 로 새로 받고 `cache: 'no-store'`. 안내 한 줄: 한글과 줄 넘김·수식 크기가 조금 다를 수 있다, 최종 확인은 한글에서. 로컬 서버 작업 8·9 사본을 node 에서 그려 쪽마다 첫 문항이 01·05·08(09)… 순서 (브라우저 확인은 별도)
- 원본 시험지 아래 한 줄 안내: `answerPages` 가 있으면 뺀 정답 쪽 번호, `textLayer` 가 false(스캔본)면 정답 쪽을 쪽 범위에서 빼고 올리라는 말
- 수식은 `src/shared` 수식 표시로

## 검토 필요

- 사유는 백엔드 문구 그대로: `풀이 누락`, `풀이 중복 N개`, `검증 실패`, `조판 확인`, `독립 검증 누락`, `독립 검증 답 다름`, `정답표와 다름 (정답표: ②)` (시험지에 붙은 정답표와 다를 때, 정답표 답을 사유에 같이 적는다)
- 검토 필요 문항의 답은 확정 답처럼 보이지 않게 한다 (경고 색, 사유 옆)
- 해제는 강사가 해제 버튼을 누를 때만 `reviewResolved=true`. 수정 저장이나 다시 풀기로 자동 해제하지 않는다
- 풀이 답과 독립 검증 답이 다르면 둘을 나란히 보여 준다

## 수정

- 2026-10-24 확인: 이 절의 `PATCH`, `rerun`, 검토 해제 버튼(`reviewResolved`), 다시 풀기 확인, 이탈 경고와 위 API 의 `problems` 목록 호출은 아직 프론트 코드가 없는 사양이다 (`src/shared/api.ts` 에 호출 없음). 지금 있는 수정은 해설 수정 요청(MCP)과 `문항 손 수정`, `보류 결정` 이다. 조판 위반 수치, `source.hwpx`·`problems.*` 다운로드 버튼도 코드 없음
- 고친 문항은 `editedByTeacher=true` 로 오고, 표시한다
- 해설 수정 요청 (MCP, `ReviseRequest.tsx`): 문항 카드 아래에 고칠 내용을 쓰면 실제 작업 제목·주소와 풀이담(pulidam) 도구를 포함하는 프롬프트를 복사해 준다. 풀이담 도구를 연결한 AI 대화창에 붙여넣는다. 사용자의 Claude 가 그 문항만 고쳐 저장하면 SSE 로 화면이 새로 고쳐진다. 요청 원문(`editRequests`)과 `강사 수정` 표시를 보인다. 우리 서버는 AI 를 부르지 않는다
- 백엔드가 고친 stem·steps 에 조판 후처리를 다시 하므로 저장 뒤 응답으로 화면을 다시 그린다
- 다시 풀기는 강사 수정을 덮어쓸 수 있다. 수정한 문항이면 확인을 받는다
- 저장 안 한 수정이 있으면 페이지 떠날 때 경고

## 다운로드

- HML 작업(`inputType` `HML`, 쪽 이미지·풀이 없음, `stage` `done`): 원본 시험지 접기, MCP 연결 안내를 보이지 않는다. 타이핑만 고른 작업도 백엔드가 문항 데이터로 카드를 보내 문항 목록(손 수정용)이 보인다 (결정 041, 풀이 칸은 빈 값). 풀이가 없는 카드(`features` 에 haesol 이 없는 작업, `ProblemCard` 의 `typingOnly`)는 `item.answer`(정답표 답)를 정답으로 보이고 독립 검증 답과 `이 해설 고쳐 달라고 하기` 칸은 숨긴다. `files.academyHwp`·`academyHwpx` 가 있으면 다운로드 줄에 `HWP`, `HWPX` (`AcademyDownloads.tsx`, `/api/jobs/{id}/academy.{hwp,hwpx}`). 이때 해설지만 받는 HWP·HWPX 링크는 숨겨 타이핑+해설 묶음으로만 받게 한다. 목록 표지는 원본 미리보기 없이 글자 표지

- 학원 시험지 작업(`features` 있음): 제목 아래에 만들 기능·진행·소속 묶음 링크. `progress` 가 hold 면 `검토 필요` 안내와 보류 결정 목록. HML 이라도 `progress` 가 haesol·variant 면 MCP 연결 안내를 보인다
- 변형 선택 작업은 `변형 차례`, 끝나면 `변형 완료` 를 보인다. 변형 실패 사유(`variantError`)는 차례 옆에 그대로 보이고 진행은 variant 를 유지한다. API 실행이 해설 뒤 변형 문제·풀이와 결과 문서까지 만들며, 보류 결정 후 재실행·변형 실패 후 재실행은 남은 것부터 이어진다고 안내한다

## 보류 결정 (사이트 3단계, 기준 `../Backend/docs/exec-plans/active/academy-hold.md`)

- `HoldPanel.tsx`: `progress` 가 hold 일 때, 또는 해설 고쳐 달라는 요청이 남아 haesol 로 돌아간 작업(문항 `decision.choice` 가 revise)일 때 `hold` 가 있는 문항마다 사유, AI 답(`answer`), 독립 검증 답, 정답표 답(`keyAnswer`)과 다섯 버튼 (AI 답으로 정하기, 정답표 답으로 정하기, 발문·정답 직접 고치기, 해설 고쳐 달라고 하기, 문제 제외하기). 직접 고치기는 문항 카드와 같은 편집기(`ItemEditor`, 아래 손 수정)로 decision edit 을 보낸다. 해설 고쳐 달라는 요청 입력
- `POST /api/jobs/{id}/problems/{no}/decision` 응답(새 작업)으로 바로 다시 그리고 목록·묶음 질의를 새로 받게 한다. 400 사유는 그대로 보인다
- 문항 카드: 결정이 있으면 `보류 결정: ...` 표시, 결정이 있고 `hold` 가 null 이면 미확정으로 보이지 않는다. 번호판은 처음에 첫 보류 문항
- 해설 고쳐 달라고 하면 진행이 해설 차례(haesol)로 돌아가 MCP 안내가 보이고, AI 가 save_revision 으로 고치면 SSE 로 새로 고쳐진다. API 버전은 묶음 실행을 다시 누르면 서버가 그 문항만 고친다 (`../Backend/docs/design-docs/decisions/043-academy-api-revise-stage.md`). 고치기 전까지 보류 목록이 남아 결정을 바꿀 수 있고(요청이 아직 안 고쳐진 문항 = `decision.choice` 가 revise 이고 `revised` 가 false 일 때만, 이미 고쳤는데 progress 가 다른 이유로 haesol 이면 열지 않는다), 안내는 `AI 연결 대화창에서 이어 하거나 묶음 실행을 다시 누르면 이 문항을 고쳐요`

## 문항 손 수정 (결정 041, `../Backend/docs/design-docs/decisions/041-academy-edit-choices-and-cells.md`)

- `ItemEditor.tsx`: 발문, 선지마다(개수 그대로), hml 문항(`inputType` HML)은 자료 표 T 를 칸마다(합친 칸은 rowSpan·colSpan, 가려진 칸은 빼고, 그림 칸은 `(그림)` 읽기 전용, `gridRows`), 정답 입력. 바뀐 것만 보낸다(`changedFields`: 선지는 하나라도 바뀌면 전체, 칸은 바뀐 칸만). AI 로 뽑은 문항은 표가 발문의 표 줄이라 표 입력 없이 발문에서 고친다. 400 사유는 그대로 보인다
- 문항 카드(`ProblemCard`)는 `item` 이 있으면 `문항 고치기` 버튼으로 같은 편집기를 열어 `editItem` 을 부르고, 응답 작업으로 바로 다시 그린다(`JobDetailPage` 의 `onChanged`, 보류 결정과 같다). 보류가 아니어도, 타이핑만 고른 작업도
- 발문·선지·표를 고치면 해설을 고른 작업은 그 문항을 다시 푼다고 안내한다 (판정은 백엔드)
- 수식 칩 (2026-10-24 사용자 결정, `EqText.tsx`): 발문·선지·표 칸은 글 + 수식 칩으로 보인다. 칩은 `RichText` 의 `Equation` 그대로(버튼, 라벨 `수식 스크립트`). 글 조각을 누르면 그 조각만 한 줄 입력칸(Enter·칸 밖 누르기 반영, Esc 취소, `수식 넣기` 는 커서 자리에 넣기), 칩을 누르면 그 줄 아래 작은 창(스크립트 입력 + 실시간 미리보기, 적용·취소·지우기, Enter 적용, Shift+Enter 줄바꿈, Esc 취소, 한글 조합 중 Enter 무시). 줄 처음·끝·수식 사이에는 빈 글 자리(점선)가 있어 어디든 글을 넣는다. 줄을 늘리고 줄이는 것과 스크립트 전체 보기는 `원문으로 보기`(예전 textarea·input). contentEditable 은 커서·한글 IME·붙여넣기 문제로 쓰지 않았다
- 저장 값은 그대로 `<<EQ>>스크립트<</EQ>>` 문자열. `toRows`(줄 -> 글·수식 조각, 빈 글 조각 덧붙임) 와 `fromRows`·`joinEquation` 은 왕복이 바이트 그대로이고, 고친 조각만 바꾼다(`replaceFragment`). 그래서 손대지 않은 칸은 원래 문자열과 같아 `changedFields` 에 안 잡힌다 (조판 후처리 규칙)
- 정답 칸 (편집기와 보류 직접 고치기 공통): 선지가 있는 문항은 숫자 1~10 을 칸을 떠날 때 동그라미(①~⑩)로, 여러 답은 `, ` 로 (`circledAnswer`: `2,4` -> `②, ④`). 입력 중에 바꾸지 않는 건 커서가 튀어서. 서술형(선지 없음), 이미 동그라미, `3번` 같은 글은 그대로. 원래 값 그대로거나 바꾼 결과가 원래 값과 같으면 보내지 않는다. 여러 답 구분자는 저장된 사례가 없어 `, ` 로 정했다 (백엔드 `Answers.choice` 는 첫 글자만 본다)

- 해설지는 저장된 최신 결과로 그때 만든다. 수정 뒤 다시 받으라고 안내
- 다 풀기 전(문항이 있고 완료 전): `haesol-draft.hwp`, `haesol-draft.hwpx` 로 지금까지 풀이로 만든 해설지를 받는 버튼. 받을 때마다 새로 만들고, 안 푼 문항은 `검토 필요: 풀이 누락` 으로 들어간다고 한 줄 알린다(해설지 보기 화면의 미리보기는 `draft` 라 푼 문항만 보이고, 풀이 누락 표시는 초안 다운로드 파일에만 있다. 안내 문구도 둘을 나눠 적는다, 2026-10-24). 완료 뒤에는 최종 다운로드 버튼만
- 해설지 모양 보기는 해설지 보기 화면 하나로 (작업 상세의 미리보기는 겹쳐서 뺐다, 2026-09-29). 작업의 `draft` 줄을 A4 2단(왼쪽 단부터, 구분선)으로 그리고 수식은 KaTeX (`haesolPages.tsx`). 우리가 만든 해설지 파일은 줄 배치 정보가 없어 `@rhwp/core` 로 그리면 줄이 겹치고 쪽 끝이 잘려 HTML 로 그린다. 글꼴과 쪽 나뉘는 위치는 한글과 조금 다르다. 쪽마다 위에 머리말(작업의 `header`, 예전 작업은 빈 줄)과 가는 선, 아래 가운데 `- N -` 쪽 번호. 본문은 왼쪽 정렬
- 풀이 저장 중에도 보인다 (단계 글은 `풀이 저장 n/m`: 서버는 모델이 지금 도는지 모르고 저장된 풀이 수만 안다): 푼 문항이 있으면 펼쳐 두고, 완료 전에는 제목에 `(풀이 저장 4/22)`. 문항 머리 줄은 다음 줄(그림이나 첫 풀이 줄)과 한 덩어리로 묶어 단·쪽 끝에 머리만 남지 않게 한다. 처음 보는 문항 번호의 줄만 2초 노란 강조 (같은 내용으로 다시 받으면 강조 안 함). 줄이 바뀌면 쪽 나누기를 다시 한다
- 해설지에는 통과 문항 표시가 없고 실패 문항만 `검토 필요: 사유` 줄이 들어간다 (다운로드 전에 알려 줄 것)
- 해설지 보기 `/jobs/{id}/haesol` (`viewer/`, 2026-09-29 타이퍼랩 문제 편집 화면을 본뜸, 수정 없음): 화면 전체 폭 3칸. 왼쪽 쪽 썸네일과 쪽마다 문항 수(`PageThumbs`), 가운데 쪽 한 장 크게 + 쪽 넘기기·확대(`PageStage`), 오른쪽 쪽별로 묶은 문항 목록(`ProblemIndex`, 누르면 그 쪽으로 가서 문항 표시). 작업 상세의 `결과물 보기` 버튼으로 간다. 쪽 나누기와 쪽 그리기는 미리보기와 같은 `haesolPages.tsx`, 칸끼리 주고받는 값은 `viewer/types.ts`
- 결과물 보기 (2026-10-23, `resultTabs.ts`): 버튼 `결과물 보기`와 화면 탭은 `resultTabs(job)` 한 곳에서 정한다. `해설지` 탭은 `draft` 가 있고 해설을 쓰는 작업(HML 은 `features` 에 haesol, 그 밖은 `draft` 만)일 때, `결과 문서` 탭은 `files.academyHwp` 가 있을 때. 결과 문서 탭도 해설지 탭과 같은 3칸 틀(`PageThumbs`, `PageStage`, `ProblemIndex`)에 `useHwpPages`(`OriginalPages.tsx`, rhwp 쪽 SVG 그림, reflow) 로 그린 `academy-view.hwp` 쪽 그림을 넣고, `dataUpdatedAt` 이 바뀌면 새로 받는다 (2026-10-24 사용자 요청: 모든 탭 같은 틀). 쪽별 문항은 `viewer/academyIndex.ts` 가 rhwp 쪽 배치에서 본문 2열 표 번호 칸 글자를 읽어 잇는다(번호 NN = 문항 순서 NN 번째, 백엔드 `AcademyWriter` 가 01 부터 쓴다. 응답 모양은 그대로). 정답은 풀이 답, 없으면 정답표 답(`item.answer`). 문항 정보가 없으면 번호 칸 번호를 그대로 표시 번호로 쓴다(타이핑만 고른 hml 작업도 백엔드가 문항 데이터로 카드를 보내 보통은 문항 정보가 있다). 정답 쪽은 왼쪽 목록에 `정답`, 그 뒤 붙은 해설지·변형 쪽은 고른 기능대로 `해설`·`변형`·`해설·변형` 으로 보인다. 오른쪽 목록은 정답 쪽 앞의 문제 쪽 번호만 잇는다(뒤에 붙은 문서의 표 칸 숫자는 문항이 아니라 건너뜀). 번호 칸이 하나도 없는 문서(해설만 고른 결과 문서)면 오른쪽 목록에 안내 한 줄. 목록 읽기가 실패해도 쪽 그림은 보이고(`renderHwpDoc` 가 `readFailed` 를 담는다), 오른쪽 목록은 번호 없음과 다르게 `문항 목록을 읽지 못했어요` 를 보인다. 읽기·reflow·그리기 실패는 `console.warn` 으로 원인을 남긴다(문단별 reflow 실패는 수를 모아 한 번). 문항 자리(2026-10-24): `academyPages` 가 번호 칸 글자와 함께 그 칸과 같은 열 바로 아래 문제 칸을 합친 사각형(`problemBox`, rhwp 쪽 표 칸의 x·y·w·h, 쪽 그림 SVG 좌표, 소수 한 자리)을 `boxes` 로 읽어 목록 문항의 `box` 에 담는다. 가운데 쪽 그림 위에 문항마다 투명한 `academy-box`(`data-label`)를 겹쳐 해설지 쪽과 같은 모양으로, 오른쪽 목록 번호에 마우스를 올리면(`ProblemIndex` 의 `onHover`) 모든 탭(해설지·변형·결과 문서)에서 가운데 그 문항(`data-label`)에 옅은 네모(`PageStage` 가 `markHover` 로 `academy-hover` 를 붙이고 뗀다, 탭을 바꾸면 비운다). 목록 번호를 누르면 진한 네모(`haesol-active`)와 그 문항 자리로 스크롤(이미 고른 문항을 다시 눌러도, 문서를 스크롤해 멀어진 뒤 다시 누르면 돌아온다: `HaesolViewerPage` 의 `listPicks` 를 `PageStage` 효과 deps 에 둔다. 마우스를 올리기만 하면 스크롤하지 않고 네모만 그린다), 쪽 위에서 누르면 진한 네모만(스크롤 안 함). 좌표는 794x1123 쪽 그림에 px 그대로 맞춘다(SVG 폭 793.7, 오차 0.04%). 썸네일에는 겹치지 않는다. 작업 8(22문항)·9(21문항)에서 문항 수만큼 모두 잡혔다. 사각형이 없는 문항(번호 칸을 못 읽음)은 네모 없이 그 쪽 맨 위로 간다. 타이핑만 한 작업은 결과 문서 탭만 보인다. 예전엔 버튼이 `inputType !== 'HML'` 로만 가려 해설까지 끝낸 HML 작업(로컬 작업 10)에서 안 보였다 (`../Backend/docs/design-docs/failures/041-result-button-hml-haesol-hidden.md`)
- 결과 문서 탭 수식 (2026-10-24, `../Backend/docs/design-docs/failures/051-viewer-equation-render-mismatch.md`): rhwp 수식은 글꼴(STIX 등 Times 비슷)·가로 늘림·근호 모양이 해설지 탭과 달라, 가운데 쪽은 rhwp 수식을 뺀 쪽 그림(`stageUrls`) 위에 해설지 탭과 같은 `RichText display` 를 겹친다(`viewer/EquationLayer.tsx`, 문항 네모 아래 층, 누르기는 네모가 받음). `useHwpPages(.., equations=true)` 가 `exportHwpx()` 본문 구역의 수식 스크립트(문서 순서)와 쪽마다 `getPageRenderTree` 의 Equation 상자를 짝짓는다(`hwpEquations.ts`). 쪽마다 상자 수만큼 HWPX 수식을 나눠 쪽 단위로 개수·저장 크기(1px)를 맞춰 보고 한 쪽이라도 어긋나면(머리말 수식 반복 포함) 그 문서는 rhwp 수식 그대로(틀린 수식을 안 보이게, 이유와 숫자는 console.warn 한 줄). 짝짓기·빼기·주소 만들기가 실패해도 `pageUrls` 가 console.warn 뒤 rhwp 수식 그대로로 돌아가고 만든 주소는 거두며, 짝지은 수식보다 적게 빼면 경고 한 줄(`stripEquations`). 자리: 왼쪽은 상자, 기준선은 줄 높이 85%, 글자 크기는 문서 수식 크기(baseUnit)에 KaTeX 1.21em, 상자보다 넓으면 상자 폭으로 줄이고 좁으면 왼쪽. 썸네일·작업 상세의 결과 문서 보기·원본 시험지는 rhwp 수식 그대로. zip 은 브라우저 `DecompressionStream` 으로 푼다(새 의존성 없음). 작업 8·9: 수식 227·288 개 모두 짝지음
- 변형문제 (2026-10-08): `make_variant_docs` 가 만든 `variant/haesol.txt` 를 `files?path=` 로 받아(없으면 404 -> 안 보임) 작업 상세에 `변형문제 보기`, 문제지·정답+해설 HWP 다운로드(`/variant-munje.hwp`, `/variant-haesol.hwp`)를 보인다. 보기 화면 `/jobs/{id}/variant` 는 해설지 보기(`HaesolViewerPage variant`)에 [문제지] [정답+해설] 탭. 처음은 문제지: `variant/munje.json`(번호, 발문, 선지, long)을 한글 문제지와 같은 2단 4칸(긴 문항은 단 전체)으로 그리고(`viewer/MunjePage.tsx`, 칸 규칙은 백엔드 `MunjeWriter` 와 같다) 문항 목록의 정답·검토 사유를 숨긴다 (학생에게 보여 줄 수 있게, 2026-10-08). 번호는 윗줄에 굵고 크게, 발문은 `parts` 대로 줄과 상자(`<보 기>` 제목은 위 테두리 가운데)로 그린다. 상자 판정은 백엔드가 해서 보낸다. 상자 줄은 표시(ㄱ./(가))와 글을 나눠 내어쓰기 (`BoxLine`). 칸에 마우스를 올리면 해설지 보기와 같은 호버 표시. 정답+해설 탭은 `variant/haesol.txt` 줄을 해설지 보기 그대로 그리고, 문항 목록의 답·검토 사유는 그 줄의 머리 줄과 `검토 필요` 줄에서 읽는다 (작업 문항 정보에 변형이 없다). `PageThumbs`·`PageStage` 는 `renderPage` 로 두 쪽 모양을 다 그린다
- 원본 미리보기 보정 (경안고 <보기> 상자): 단 비율로 적힌 개체 크기는 백엔드가 실제 크기(curSz)로 바꾼 사본 `view.hwpx` 를 그리고, 렌더러의 글상자 안쪽 자르기(`textbox-clip`)는 뺀다. 한글은 글상자 안 개체가 여백을 넘어도 그린다
