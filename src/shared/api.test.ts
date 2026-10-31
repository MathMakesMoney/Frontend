import { afterEach, describe, expect, it, vi } from 'vitest'
import { decideHold, fetchJobs, login, UNAUTHORIZED_EVENT } from './api'

afterEach(() => vi.unstubAllGlobals())

// 브라우저 쿠키와 창 이벤트를 흉내 낸다
function stubBrowser(cookie: string) {
  const dispatchEvent = vi.fn()
  vi.stubGlobal('document', { cookie })
  vi.stubGlobal('window', { dispatchEvent })
  return dispatchEvent
}

describe('CSRF 와 401', () => {
  it('POST 는 XSRF-TOKEN 쿠키 값을 X-XSRF-TOKEN 헤더로 보낸다', async () => {
    stubBrowser('a=1; XSRF-TOKEN=tok123')
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 1, email: 'a@b.c', name: '김' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await login('a@b.c', 'password1')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/login')
    expect(init.headers.get('X-XSRF-TOKEN')).toBe('tok123')
    expect(init.body.toString()).toBe('email=a%40b.c&password=password1')
  })

  it('GET 에는 헤더를 붙이지 않는다', async () => {
    stubBrowser('XSRF-TOKEN=tok123')
    const fetchMock = vi.fn().mockResolvedValue(new Response('[]', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await fetchJobs()
    expect(fetchMock.mock.calls[0][1].headers.has('X-XSRF-TOKEN')).toBe(false)
  })

  it('쿠키가 없으면 POST 전에 GET /api/me 로 받는다', async () => {
    const doc = { cookie: '' }
    vi.stubGlobal('document', doc)
    vi.stubGlobal('window', { dispatchEvent: vi.fn() })
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url === '/api/me') doc.cookie = 'XSRF-TOKEN=fresh'
      return new Response('{"id":"1"}', { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    await decideHold('1', 2, { choice: 'ai' })
    expect(fetchMock.mock.calls.map(c => c[0])).toEqual(['/api/me', '/api/jobs/1/problems/2/decision'])
    expect(fetchMock.mock.calls[1][1].headers.get('X-XSRF-TOKEN')).toBe('fresh')
  })

  it('로그인 밖 API 의 401 은 이벤트로 알리고, 로그인 실패 401 은 알리지 않는다', async () => {
    const dispatch = stubBrowser('XSRF-TOKEN=t')
    const body = JSON.stringify({ error: '로그인이 필요합니다.' })
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(body, { status: 401 })))
    await expect(fetchJobs()).rejects.toThrow('로그인이 필요합니다.')
    expect(dispatch.mock.calls[0][0].type).toBe(UNAUTHORIZED_EVENT)
    dispatch.mockClear()
    await expect(login('a@b.c', 'x')).rejects.toThrow()
    expect(dispatch).not.toHaveBeenCalled()
  })
})

describe('decideHold', () => {
  it('변형 문항으로 바꾸기는 choice replace 와 오류 설명(request)을 결정 주소로 보낸다', async () => {
    stubBrowser('XSRF-TOKEN=t')
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: '6' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await decideHold('6', 20, { choice: 'replace', request: '정의역과 범위가 모순' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/jobs/6/problems/20/decision')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ choice: 'replace', request: '정의역과 범위가 모순' })
  })
})
