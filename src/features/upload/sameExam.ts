type Named = Pick<File, 'name' | 'webkitRelativePath'>

// 같은 폴더에서 확장자를 뗀 이름이 같은 시험지 묶음 (2개 이상만, 파일 번호 목록). 다른 폴더의 같은 이름은 다른 시험지로 본다
export function sameExamGroups(files: Named[]): number[][] {
  const byKey = new Map<string, number[]>()
  files.forEach((file, i) => {
    const dir = file.webkitRelativePath.split('/').slice(0, -1).join('/')
    const key = `${dir}/${file.name.replace(/\.[^.]*$/, '')}`.normalize('NFC').toLowerCase()
    byKey.set(key, [...(byKey.get(key) ?? []), i])
  })
  return [...byKey.values()].filter(group => group.length >= 2)
}

// 올릴 파일 번호: 묶음마다 고른 하나만 남긴다. choice 는 묶음 첫 번호 -> 고른 파일 번호 (안 고른 묶음은 모두 남긴다)
export function keptIndexes(count: number, groups: number[][], choice: Record<number, number>): number[] {
  const dropped = new Set(groups.filter(g => g[0] in choice).flatMap(g => g.filter(i => i !== choice[g[0]])))
  return Array.from({ length: count }, (_, i) => i).filter(i => !dropped.has(i))
}
