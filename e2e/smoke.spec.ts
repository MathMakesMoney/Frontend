import { expect, test } from '@playwright/test'
import { mockApi } from './mock'

test('작업 화면: 번호판과 카드가 받은 순서대로, 20-1 20-2 라벨 그대로', async ({ page }) => {
  await mockApi(page)
  await page.goto('/jobs/1')
  const nav = page.locator('.problem-nav-item')
  await expect(nav).toHaveText(['전체 보기', '1', '2', '3', '20-1', '20-2', '21'])
  await page.getByRole('button', { name: '전체 보기' }).click()
  await expect(page.locator('.problem-card .problem-no')).toHaveText(['1번', '2번', '3번', '20-1번', '20-2번', '21번'])
})

test('발문 줄바꿈: 보기 줄이 한 줄로 합쳐지지 않는다', async ({ page }) => {
  await mockApi(page)
  await page.goto('/jobs/1')
  const stem = page.locator('.problem-stem').first()
  await expect(stem).toHaveCSS('white-space', 'pre-line')
  // innerText 는 실제 그려진 줄바꿈을 따른다: 보기 세 줄이 각각 한 줄
  const lines = (await stem.innerText()).split('\n')
  expect(lines).toEqual(expect.arrayContaining(['ㄱ. a는 1이다.', 'ㄴ. b는 2이다.', 'ㄷ. c는 3이다.']))
})

test('문항 고치기: 수식 칩, 수식 창 열기·취소, 정답 동그라미, 저장 본문', async ({ page }) => {
  const puts = await mockApi(page)
  await page.goto('/jobs/1')
  await page.getByRole('button', { name: '문항 고치기' }).click()

  const editor = page.locator('.item-editor')
  const chip = editor.getByRole('button', { name: '수식 x^2' })
  await expect(chip.locator('.katex')).toBeVisible()
  await expect(editor).not.toContainText('<<EQ>>')

  // 칩을 누르면 스크립트 입력칸과 미리보기, 취소하면 그대로 닫힌다
  await chip.click()
  const pop = editor.locator('.eq-pop')
  await expect(pop.getByLabel('수식 스크립트')).toHaveValue('x^2')
  await expect(pop.locator('.eq-preview .katex')).toBeVisible()
  await pop.getByRole('button', { name: '취소' }).click()
  await expect(pop).toHaveCount(0)
  await expect(chip).toBeVisible()

  // 정답 칸에 1 을 쓰고 칸을 떠나면 ①
  const answer = editor.getByLabel(/정답표 답/)
  await answer.fill('1')
  await answer.blur()
  await expect(answer).toHaveValue('①')

  // 저장하면 바뀐 정답만 서버로 간다
  await editor.getByRole('button', { name: '고친 내용 저장' }).click()
  await expect(editor).toHaveCount(0)
  expect(puts).toEqual([{ answer: '①' }])
})

test('해설지 보기: 수식이 모두 그려진다', async ({ page }) => {
  await mockApi(page)
  await page.goto('/jobs/1/haesol')
  // 쪽 나누기용 숨은 사본(.haesol-measure)을 빼고, 화면에 그려진 쪽의 수식만 본다
  const katex = page.locator('.page-stage .katex')
  await expect(katex.first()).toBeVisible()
  expect(await katex.count()).toBeGreaterThanOrEqual(4)
  await expect(page.locator('.katex-error')).toHaveCount(0)
  await expect(page.locator('[data-eq-fallback]')).toHaveCount(0)
})

test('로그인 안 했으면 작업 화면 대신 로그인 화면, 틀린 로그인은 서버 문장 그대로', async ({ page }) => {
  await page.route(url => url.pathname.startsWith('/api/'), route => {
    const { pathname } = new URL(route.request().url())
    if (pathname === '/api/auth/login') return route.fulfill({ status: 401, json: { error: '이메일 또는 비밀번호가 맞지 않습니다.' } })
    return route.fulfill({ status: 401, json: { error: '로그인이 필요합니다.' } })
  })
  await page.goto('/jobs')
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('이메일').fill('a@test.kr')
  await page.getByLabel('비밀번호').fill('password1')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('이메일 또는 비밀번호가 맞지 않습니다.')
})
