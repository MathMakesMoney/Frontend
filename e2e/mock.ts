import type { Page } from '@playwright/test'
import job from './fixtures/job.json' with { type: 'json' }

// /api 를 가짜 응답으로 막는다 (백엔드 없이 돈다). 가짜 데이터만 쓰고 실제 시험지 글은 넣지 않는다
// 반환값: 작업 수정(PUT /item)으로 서버가 받은 본문들
export async function mockApi(page: Page) {
  const puts: unknown[] = []
  await page.route(url => url.pathname.startsWith('/api/'), route => {
    const { pathname } = new URL(route.request().url())
    const method = route.request().method()
    if (pathname === '/api/me') return route.fulfill({ json: { id: 1, email: 'a@test.kr', name: '테스트' } }) // 로그인한 상태
    if (pathname === '/api/jobs/1' && method === 'GET') return route.fulfill({ json: job })
    if (pathname === '/api/jobs/1/problems/1/item' && method === 'PUT') {
      puts.push(route.request().postDataJSON())
      return route.fulfill({ json: job })
    }
    if (pathname === '/api/jobs/1/events') return route.fulfill({ contentType: 'text/event-stream', body: ': ok\n\n' })
    return route.fulfill({ status: 404, body: '' }) // 변형문제 파일 등은 없는 것으로
  })
  return puts
}
