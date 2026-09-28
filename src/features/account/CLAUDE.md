# account

로그인, 내 정보, 요금제·크레딧, 사용량. 기준: `../Backend/src/main/java/com/mathmakesmoney/backend/account/CLAUDE.md`

## API (백엔드 초안)

- `POST /api/auth/signup`, `/login`, `/logout`
- `GET /api/me`: 회원, 요금제, 크레딧 잔액
- `GET /api/me/usage`: 기간별 해설지 생성 건수, 토큰, 비용

## 화면

- 로그인·가입 (방식 미정, 추천 카카오 + 이메일)
- 내 정보: 요금제, 크레딧 잔액(AI API 요금제)
- 사용량: 기간별 건수, 토큰, 비용

## 요금제별 보여 줄 것

| 요금제 | 보여 줄 것 |
|---|---|
| MCP | MCP 연결 안내 (`src/features/mcp/`), 이용 건수 |
| AI API | 크레딧 잔액, 부족하면 충전 안내. 무료 체험은 1세트 |

## 미정

- 결제(PG), 요금 금액, 충전 화면
