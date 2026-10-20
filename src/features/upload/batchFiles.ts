import type { BatchItem, Feature } from '../../shared/api'
import { fileTitle } from './fileTitle'

const ACCEPTED = ['.pdf', '.hwp', '.hwpx', '.hml']
const FEATURES: Feature[] = ['typing', 'haesol', 'variant']

const isHml = (file: File) => file.name.toLowerCase().endsWith('.hml')

// 시험지마다 따로 채우는 값 (제목은 파일명에서 시작)
export interface Row extends Omit<BatchItem, 'range'> {}
export type Common = Omit<Row, 'title'>

export const EMPTY_COMMON: Common = { scope: '', school: '', grade: '', exam: '', features: ['typing'] }

// 고른 파일을 나눈다: hml 이 2개 이상이면 묶음(hml 만, 이름순), 아니면 지원하는 첫 파일 하나. 못 넣은 파일 이름은 skipped
export function pickFiles(picked: File[]): { files: File[]; skipped: string[] } {
  const hmls = picked.filter(isHml)
  const usable = hmls.length >= 2 ? hmls : picked.filter(f => ACCEPTED.some(ext => f.name.toLowerCase().endsWith(ext))).slice(0, 1)
  const files = [...usable].sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }))
  const skipped = picked.filter(f => !usable.includes(f) && !f.name.startsWith('.')).map(f => f.name)
  return { files, skipped }
}

export function newRow(file: File): Row {
  return { ...EMPTY_COMMON, title: fileTitle('', '', file.name) }
}

// 기능 체크: 변형을 켜면 해설도 켜고, 해설은 변형이 켜진 동안 끌 수 없다. 순서는 타이핑·해설·변형
export function toggleFeature(features: Feature[], feature: Feature, on: boolean): Feature[] {
  const next = new Set(features)
  if (on) next.add(feature)
  else if (!(feature === 'haesol' && next.has('variant'))) next.delete(feature)
  if (next.has('variant')) next.add('haesol')
  return FEATURES.filter(f => next.has(f))
}

// 공통 값을 모든 시험지에 채운다: 빈 칸은 각 시험지 값을 지우지 않고, 기능은 그대로 덮어쓴다
export function applyCommon(rows: Row[], common: Common): Row[] {
  const fill = (own: string, shared: string) => (shared.trim() ? shared : own)
  return rows.map(row => ({
    ...row,
    scope: fill(row.scope, common.scope),
    school: fill(row.school, common.school),
    grade: fill(row.grade, common.grade),
    exam: fill(row.exam, common.exam),
    features: common.features,
  }))
}
