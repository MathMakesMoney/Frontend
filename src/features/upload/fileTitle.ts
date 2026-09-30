// 직접 수정하지 않은 제목만 새 파일명으로 채운다
export function fileTitle(title: string, previousName: string, nextName: string): string {
  const withoutExtension = (name: string) => name.replace(/\.(pdf|hwpx?)$/i, '')
  return !title.trim() || title === withoutExtension(previousName) ? withoutExtension(nextName) : title
}
