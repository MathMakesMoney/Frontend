// 결과 문서 탭: rhwp 쪽 그림에서 수식을 빼고 그 자리에 해설지 탭과 같은 웹 수식(RichText)을 겹쳐 그리기 위한 자료 (../Backend 오류 기록 051)

// rhwp 쪽 그림의 수식 상자 (쪽 SVG 좌표 px). baseline 은 그 수식이 놓인 줄의 기준선
export type EqBox = { x: number; y: number; w: number; h: number; baseline: number }
// HWPX 의 수식 하나: 스크립트, 저장된 크기(px), 글자 크기(px)
export type HwpxEq = { script: string; w: number; h: number; size: number }
export type PageEq = EqBox & { script: string; size: number }

type TreeNode = { type: string; bbox?: { x: number; y: number; w: number; h: number }; children?: TreeNode[] }
type BoxDoc = { pageCount(): number; getPageRenderTree(page: number): string }

const PX = 96 / 7200 // HWPUNIT -> px

// 쪽마다 수식 상자를 문서 순서로 모은다. rhwp 는 줄 기준선을 줄 높이의 85% 에 둔다 (../Backend 오류 기록 050)
export function equationBoxes(doc: BoxDoc): EqBox[][] {
  return Array.from({ length: doc.pageCount() }, (_, page) => {
    const out: EqBox[] = []
    const walk = (n: TreeNode, parent?: TreeNode) => {
      if (n.type === 'Equation' && n.bbox) {
        const line = parent?.type === 'TextLine' && parent.bbox ? parent.bbox : n.bbox
        out.push({ ...n.bbox, baseline: line.y + line.h * 0.85 })
      }
      n.children?.forEach((c) => walk(c, n))
    }
    walk(JSON.parse(doc.getPageRenderTree(page)))
    return out
  })
}

// 결과 문서 탭이 쪽 그림과 함께 읽는 수식 원본: HWPX 로 내보낸 문서와 쪽별 수식 상자
export function equationSource(doc: BoxDoc & { exportHwpx(): Uint8Array }) {
  return { hwpx: doc.exportHwpx(), boxes: equationBoxes(doc) }
}

const ENTITY: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }

// XML 글자 되돌리기 (&lt; &#60; &#x3c;)
function unescapeXml(s: string): string {
  return s.replace(/&(#x?)?(\w+);/g, (m, num: string | undefined, v: string) =>
    num ? String.fromCodePoint(parseInt(v, num === '#x' ? 16 : 10)) : (ENTITY[v] ?? m),
  )
}

// HWPX 본문(section*.xml)의 수식을 문서 순서로 읽는다: 스크립트, 저장 크기(hp:sz), 글자 크기(baseUnit, 1/100 pt)
export function parseEquations(xml: string): HwpxEq[] {
  return [...xml.matchAll(/<hp:equation ([^>]*)>([\s\S]*?)<\/hp:equation>/g)].map(([, attrs, body]) => ({
    script: unescapeXml(body.match(/<hp:script>([\s\S]*?)<\/hp:script>/)?.[1] ?? ''),
    w: Number(body.match(/<hp:sz width="(\d+)"/)?.[1] ?? 0) * PX,
    h: Number(body.match(/<hp:sz [^>]*height="(\d+)"/)?.[1] ?? 0) * PX,
    size: Number(attrs.match(/baseUnit="(\d+)"/)?.[1] ?? 0) / 75, // pt/100 x 4/3
  }))
}

// zip 에서 이름이 맞는 항목들을 글로 푼다: 끝의 중앙 디렉터리를 읽고, 압축은 deflate(8) 또는 저장(0)
async function zipTexts(bytes: Uint8Array, want: RegExp): Promise<{ name: string; text: string }[]> {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let end = bytes.length - 22
  while (end >= 0 && v.getUint32(end, true) !== 0x06054b50) end--
  if (end < 0) throw new Error('zip 이 아닙니다')
  const out: { name: string; text: string }[] = []
  for (let i = 0, p = v.getUint32(end + 16, true); i < v.getUint16(end + 10, true); i++) {
    const method = v.getUint16(p + 10, true)
    const size = v.getUint32(p + 20, true)
    const nameLen = v.getUint16(p + 28, true)
    const local = v.getUint32(p + 42, true)
    const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen))
    p += 46 + nameLen + v.getUint16(p + 30, true) + v.getUint16(p + 32, true)
    if (!want.test(name)) continue
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true)
    const stream = new Blob([bytes.slice(start, start + size)]).stream()
    out.push({ name, text: await new Response(method === 8 ? stream.pipeThrough(new DecompressionStream('deflate-raw')) : stream).text() })
  }
  return out
}

// HWPX 본문 구역을 번호 순서로 풀어 수식을 모은다
export async function hwpxEquations(hwpx: Uint8Array): Promise<HwpxEq[]> {
  const no = (name: string) => Number(name.match(/(\d+)\.xml$/)![1])
  const sections = await zipTexts(hwpx, /^Contents\/section\d+\.xml$/)
  return sections.sort((a, b) => no(a.name) - no(b.name)).flatMap((s) => parseEquations(s.text))
}

// 쪽 수식 상자와 HWPX 수식을 순서대로 짝짓는다. 쪽마다 상자 수만큼 HWPX 수식을 나눠 그 쪽의 크기 열(sz)이 상자와 1px 안에서
// 맞는지 보고, 개수가 다르거나 한 쪽이라도 어긋나면 null: 다른 수식을 그 자리에 그리지 않게 그 문서는 rhwp 수식 그대로 둔다
// (머리말·꼬리말 수식은 쪽마다 상자로 나오지만 HWPX 에는 한 번이라 개수가 달라 여기로 온다)
export function pairEquations(pages: EqBox[][], eqs: HwpxEq[]): PageEq[][] | null {
  const total = pages.reduce((n, p) => n + p.length, 0)
  if (total !== eqs.length) return give(`개수 불일치 (쪽 수식 상자 ${total}개, HWPX 수식 ${eqs.length}개)`)
  let k = 0
  const out: PageEq[][] = []
  for (const [page, boxes] of pages.entries()) {
    const mine = eqs.slice(k, (k += boxes.length))
    const bad = boxes.findIndex((b, i) => Math.abs(b.w - mine[i].w) > 1 || Math.abs(b.h - mine[i].h) > 1)
    if (bad >= 0) return give(`${page + 1}쪽 크기 불일치 (${bad + 1}번째 수식 상자 ${boxes[bad].w}x${boxes[bad].h}, HWPX ${mine[bad].w}x${mine[bad].h})`)
    out.push(boxes.map((b, i) => ({ ...b, script: mine[i].script, size: mine[i].size })))
  }
  return out
}

// 짝짓기를 포기하는 이유를 남기고 null (그 문서는 rhwp 수식 그대로)
function give(reason: string): null {
  console.warn(`수식 짝짓기를 포기해 rhwp 수식 그대로 보입니다: ${reason}`)
  return null
}

// 쪽 그림에서 짝지은 수식의 rhwp 묶음(<g transform="translate(x,y) [scale(..)]">)을 뺀다. 수식 묶음 안에는 g 가 없어
// 안에 g 가 든 묶음(글상자 등)은 건너뛰고 그 안의 수식 묶음을 찾는다
export function stripEquations(svg: string, page: PageEq[]): string {
  let removed = 0
  const out = svg.replace(/<g transform="translate\(([\d.-]+),([\d.-]+)\)(?: scale\([^)]*\))?">(?:(?!<g[ >])[\s\S])*?<\/g>/g, (m, x: string, y: string) => {
    if (!page.some((e) => Math.abs(e.x - Number(x)) < 0.1 && Math.abs(e.y - Number(y)) < 0.1)) return m
    removed++
    return ''
  })
  // 적게 뺐으면 그 수식은 rhwp 와 웹 수식이 겹쳐 두 번 그려진다
  if (removed < page.length) console.warn(`수식 ${page.length}개 중 ${removed}개만 쪽 그림에서 빼 두 번 그려질 수 있습니다`)
  return out
}

// 그린 웹 수식(폭 width, 기준선 base: 요소 위에서 잰 값)을 상자 폭 w 에 넣는다: 넓으면 줄이고, 좁으면 제 크기로 왼쪽. 기준선은 요소 top 자리로
export function eqTransform(w: number, width: number, base: number): string {
  const s = width > w ? w / width : 1
  return `translate(0px, ${-base * s}px) scale(${s})`
}
