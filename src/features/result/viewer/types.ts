import type { ReactNode } from 'react'
import type { Box } from './academyIndex'

// 해설지 보기(3칸) 부품끼리 주고받는 값. 쪽 번호 page 는 0부터

// 오른쪽 목록의 문항 한 개: 해설지에 나온 쪽과 문항 정보
export interface ProblemEntry {
  label: string // 해설지 머리 줄의 표시 번호 (20-1 같은 모양도 있다)
  page: number // 문항 머리 줄이 있는 쪽
  answer: string | null // <<EQ>> 가 섞인 답 원문 (RichText 로 그린다)
  review: string | null // 검토 필요 사유 (null 이면 통과)
  hasFigure: boolean
  box?: Box // 결과 문서(쪽 그림)에서 문항 자리 (쪽 그림 좌표)
}

// 왼쪽: 쪽 썸네일 목록
export interface PageThumbsProps {
  pageCount: number
  renderPage: (index: number) => ReactNode // 쪽 한 장 (해설지 쪽 또는 문제지 쪽)
  current: number
  entries: ProblemEntry[]
  notes?: (string | undefined)[] // 쪽 번호 옆 글을 문항 수 대신 (결과 문서의 정답 쪽, 붙인 해설 쪽)
  onSelect: (page: number) => void
}

// 가운데: 고른 쪽 한 장을 크게. active 문항이 있으면 그 문항 위치로 스크롤하고 표시한다
export interface PageStageProps {
  pageCount: number
  renderPage: (index: number, active: string | null) => ReactNode
  current: number
  active: string | null
  hovered: string | null // 오른쪽 목록에서 마우스를 올린 문항
  onChange: (page: number) => void
  onPick: (label: string) => void // 쪽 위의 문항을 누르면 (오른쪽 목록에 표시)
}

// 오른쪽: 쪽별로 묶은 문항 목록. 누르면 그 문항의 쪽으로 가서 표시
export interface ProblemIndexProps {
  entries: ProblemEntry[]
  pageCount: number
  current: number
  active: string | null
  hideAnswers?: boolean // 학생용 문제지 보기: 정답·검토 사유를 숨긴다
  readFailed?: boolean // 결과 문서 목록 읽기가 실패함 (번호 없는 문서와 다른 안내)
  onSelect: (entry: ProblemEntry) => void
  onHover?: (label: string | null) => void // 번호에 마우스를 올리면 (결과 문서의 가운데 쪽에 네모)
}
