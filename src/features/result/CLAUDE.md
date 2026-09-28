# result (문항별 결과)

문항별 풀이 확인·수정, 검토 필요 처리, 한 문항 다시 풀기, 해설지 다운로드. (F4~F9, F11) 기준: `../Backend/.../job/presentation/CLAUDE.md`, `solution/domain/review/CLAUDE.md`

## API

- `GET /api/jobs/{id}/problems` -> `[{"no", "printedNo", "stem", "choices", "figures", "answer", "steps", "verification": {"pass", "reason"}, "blindAnswer", "review": ["사유"], "typesetting": {"outside", "hangulInEq", "unbalanced"}, "editedByTeacher", "revisionCount", "model"}]`. `answer` 는 풀이 누락이면 null
- `PATCH /api/jobs/{id}/problems/{no}`: `{"stem"?, "choices"?, "answer"?, "steps"?, "reviewResolved"?}`
- `POST /api/jobs/{id}/problems/{no}/rerun`: 그 문항만 풀이 -> 검증 -> 독립 검증 -> 판정 다시
- `GET /api/jobs/{id}/pages/{page}.png`: 원본 쪽 이미지 (150dpi)
- 다운로드: `haesol.hwp`, `haesol.hwpx`, (HWP 입력) `source.hwpx`, (F9) `problems.hwp`, `problems.hwpx`

## 화면

- 목록: 검토 필요 문항을 위로 또는 필터. 번호는 `printedNo` 를 보이고, 밀린 번호(`no` != `printedNo`)면 둘 다 보인다
- 문항 한 개: 발문, 선지, 그림, 답, 풀이 줄, 검증 결과, 독립 검증 답, 검토 사유, 조판 위반 수치
- `answer` 가 null 이면(풀이 누락) 빈 답으로 보이고 검토 사유 `풀이 누락` 을 같이 보인다. 해설지에도 빈 값으로 나간다
- 원본 대조: 옆에 원본 쪽 이미지를 띄워 강사가 추출이 맞는지 볼 수 있게
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
- 미리보기: 받을 해설지와 같은 글(`haesol_pdf.txt`, files 경로)을 A4 2단(왼쪽 단부터, 구분선)으로 그리고 수식은 KaTeX (`HaesolPreview.tsx`). 한글 파일 렌더러 `@rhwp/core` 는 키 큰 수식(분수, 합)에서 줄이 겹치고 긴 수식이 줄을 안 넘기고 쪽 끝이 잘려(한컴 뷰어는 정상) 뺐다. 글꼴과 쪽 나뉘는 위치는 한글과 조금 다르다. 쪽마다 위에 머리말(작업의 `header`, 예전 작업은 빈 줄)과 가는 선, 아래 가운데 `- N -` 쪽 번호. 본문 높이는 둘을 뺀 고정값이고 쪽 나누기 계산용 쪽도 같은 머리말·쪽 번호를 단다. 본문은 왼쪽 정렬
- 해설지에는 통과 문항 표시가 없고 실패 문항만 `검토 필요: 사유` 줄이 들어간다 (다운로드 전에 알려 줄 것)
