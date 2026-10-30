import { afterEach, describe, expect, it, vi } from 'vitest'
import { decideHold } from './api'

afterEach(() => vi.unstubAllGlobals())

describe('decideHold', () => {
  it('변형 문항으로 바꾸기는 choice replace 와 오류 설명(request)을 결정 주소로 보낸다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: '6' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await decideHold('6', 20, { choice: 'replace', request: '정의역과 범위가 모순' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/jobs/6/problems/20/decision')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ choice: 'replace', request: '정의역과 범위가 모순' })
  })
})
