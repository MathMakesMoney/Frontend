# result (문항별 결과)

문항별 풀이 확인·수정, 검토 필요 처리, 한 문항 다시 풀기, 해설지 다운로드. (F4~F9, F11) 기준: `../Backend/.../job/presentation/CLAUDE.md`, `solution/domain/review/CLAUDE.md`

## API

- `GET /api/jobs/{id}/problems` -> `[{"no", "printedNo", "stem", "choices", "figures", "answer", "steps", "verification": {"pass", "reason"}, "blindAnswer", "review": ["사유"], "typesetting": {"outside", "hangulInEq", "unbalanced"}, "editedByTeacher", "revisionCount", "model"}]`. `answer` 는 풀이 누락이면 null
- `PATCH /api/jobs/{id}/problems/{no}`: `{"stem"?, "choices"?, "answer"?, "steps"?, "reviewResolved"?}`
- `POST /api/jobs/{id}/problems/{no}/rerun`: 그 문항만 풀이 -> 검증 -> 독립 검증 -> 판정 다시
- `GET /api/jobs/{id}/pages/{page}.png`: 원본 쪽 이미지 (150dpi, PDF)
- `GET /api/jobs/{id}/files?path=source.hwpx` 또는 `source.hwp`: 한글 입력의 원본 파일 (어느 쪽인지는 `inputType`)
- 작업 JSON 의 `draft`: 지금까지 저장된 풀이로 만든 해설지 줄 (`haesol_pdf.txt` 와 같은 모양, 푼 문항만)
- `GET /api/jobs/{id}/events` (SSE): MCP 도구가 불릴 때마다 `changed` 이벤트. 받으면 작업을 다시 받는다. 5초 폴링은 뺐다 (끊기면 EventSource 가 다시 붙는다)
- 다운로드: `haesol.hwp`, `haesol.hwpx`, (HWP 입력) `source.hwpx`, (F9) `problems.hwp`, `problems.hwpx`

## 화면

- 목록: 검토 필요 문항을 위로 또는 필터. 번호는 `printedNo` 를 보이고, 밀린 번호(`no` != `printedNo`)면 둘 다 보인다
- 문항 한 개: 발문, 선지, 그림, 답, 풀이 줄, 검증 결과, 독립 검증 답, 검토 사유, 조판 위반 수치
- `answer` 가 null 이면(풀이 누락) 빈 답으로 보이고 검토 사유 `풀이 누락` 을 같이 보인다. 해설지에도 빈 값으로 나간다
- 원본 시험지: 업로드·문항 저장 단계면 펼쳐 두고 그 뒤는 접는다 (강사가 누르면 그대로). PDF 는 쪽 이미지, HWP·HWPX 는 원본 파일을 `@rhwp/core` 로 쪽마다 SVG 로 그린다. WASM 은 펼칠 때만 불러온다. 한글이 저장한 원본은 줄 배치 정보가 있어 잘 그려진다 (광덕고 HWP·HWPX 7쪽, 수식·그림 정상. `BOX`, `!=` 같은 일부 수식 명령은 글자 그대로 나온다)
- 원본 시험지 아래 한 줄 안내: `answerPages` 가 있으면 뺀 정답 쪽 번호, `textLayer` 가 false(스캔본)면 정답 쪽을 쪽 범위에서 빼고 올리라는 말
- 수식은 `src/shared` 수식 표시로

## 검토 필요

- 사유는 백엔드 문구 그대로: `풀이 누락`, `풀이 중복 N개`, `검증 실패`, `조판 확인`, `독립 검증 누락`, `독립 검증 답 다름`
- 검토 필요 문항의 답은 확정 답처럼 보이지 않게 한다 (경고 색, 사유 옆)
- 해제는 강사가 해제 버튼을 누를 때만 `reviewResolved=true`. 수정 저장이나 다시 풀기로 자동 해제하지 않는다
- 풀이 답과 독립 검증 답이 다르면 둘을 나란히 보여 준다

## 수정

- 고친 문항은 `editedByTeacher=true` 로 오고, 표시한다
- 백엔드가 고친 stem·steps 에 조판 후처리를 다시 하므로 저장 뒤 응답으로 화면을 다시 그린다
- 다시 풀기는 강사 수정을 덮어쓸 수 있다. 수정한 문항이면 확인을 받는다
- 저장 안 한 수정이 있으면 페이지 떠날 때 경고

## 다운로드

- 해설지는 저장된 최신 결과로 그때 만든다. 수정 뒤 다시 받으라고 안내
- 다 풀기 전(문항이 있고 완료 전): `haesol-draft.hwp`, `haesol-draft.hwpx` 로 지금까지 풀이로 만든 해설지를 받는 버튼. 받을 때마다 새로 만들고, 안 푼 문항은 `검토 필요: 풀이 누락` 으로 들어간다고 한 줄 알린다. 완료 뒤에는 최종 다운로드 버튼만
- 미리보기: 작업의 `draft` 줄을 A4 2단(왼쪽 단부터, 구분선)으로 그리고 수식은 KaTeX (`HaesolPreview.tsx`). 우리가 만든 해설지 파일은 줄 배치 정보가 없어 `@rhwp/core` 로 그리면 줄이 겹치고 쪽 끝이 잘려 HTML 로 그린다. 글꼴과 쪽 나뉘는 위치는 한글과 조금 다르다. 쪽마다 위에 머리말(작업의 `header`, 예전 작업은 빈 줄)과 가는 선, 아래 가운데 `- N -` 쪽 번호. 본문 높이는 둘을 뺀 고정값이고 쪽 나누기 계산용 쪽도 같은 머리말·쪽 번호를 단다. 본문은 왼쪽 정렬
- 풀이 저장 중에도 보인다 (단계 글은 `풀이 저장 n/m`: 서버는 모델이 지금 도는지 모르고 저장된 풀이 수만 안다): 푼 문항이 있으면 펼쳐 두고, 완료 전에는 제목에 `(풀이 저장 4/22)`. 문항 머리 줄은 다음 줄(그림이나 첫 풀이 줄)과 한 덩어리로 묶어 단·쪽 끝에 머리만 남지 않게 한다. 처음 보는 문항 번호의 줄만 2초 노란 강조 (같은 내용으로 다시 받으면 강조 안 함). 줄이 바뀌면 쪽 나누기를 다시 한다
- 해설지에는 통과 문항 표시가 없고 실패 문항만 `검토 필요: 사유` 줄이 들어간다 (다운로드 전에 알려 줄 것)
