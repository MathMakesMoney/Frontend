import { describe, expect, it } from 'vitest'
import { reviseCommand } from './ReviseRequest'

describe('reviseCommand', () => {
  it('작업 번호·문항 번호·요청을 한 줄 명령으로, 큰따옴표는 작은따옴표로', () => {
    expect(reviseCommand('9', '4번', '좌표를 먼저 "쓰고"\n계산해')).toBe(
      `claude "작업 9 4번 해설을 고쳐줘: 좌표를 먼저 '쓰고' 계산해. mmm 도구 get_problem 으로 문항을 보고 save_revision 으로 저장해."`,
    )
  })
})
