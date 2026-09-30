import { describe, expect, it } from 'vitest'
import { revisePrompt } from './ReviseRequest'

describe('revisePrompt', () => {
  it('터미널 명령 없이 제목·문항·주소를 담은 프롬프트를 만든다', () => {
    const command = revisePrompt('9', '중간고사', '4번', "좌표 ' $HOME `whoami`\n계산해", 'https://study.example')
    expect(command).toContain("중간고사 4번")
    expect(command).toContain("좌표 ' $HOME `whoami` 계산해")
    expect(command).toContain('https://study.example/jobs/9')
    expect(command).toContain('풀이담(pulidam) 도구')
    expect(command).not.toContain('작업 9')
    expect(command).not.toMatch(/^claude /)
  })
})
