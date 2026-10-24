import { expect, it } from 'vitest'
import { eqTransform, equationBoxes, hwpxEquations, pairEquations, parseEquations, stripEquations } from './hwpEquations'

// 결과 문서 탭: rhwp 수식을 빼고 그 자리에 해설지 탭과 같은 웹 수식(RichText)을 겹쳐 그린다 (../Backend 오류 기록 051)

const eqXml = (script: string, w: number, h: number, unit = 1100) =>
  `<hp:equation id="1" baseLine="85" baseUnit="${unit}" font="HYhwpEQ"><hp:script>${script}</hp:script>` +
  `<hp:sz width="${w}" widthRelTo="ABSOLUTE" height="${h}" heightRelTo="ABSOLUTE"/><hp:pos treatAsChar="1"/></hp:equation>`

const px = (hwpunit: number) => hwpunit * (96 / 7200)

it('HWPX 본문의 수식을 문서 순서로 읽는다: 스크립트(XML 글자 되돌림), 저장 크기 px, 글자 크기 px', () => {
  const xml = `<hp:p>${eqXml('y={x+2} over {3}`', 5918, 3025)}<hp:t>는</hp:t>${eqXml('x &lt;`-3 &amp;&amp; a', 720, 1237, 1000)}</hp:p>`
  expect(parseEquations(xml)).toEqual([
    { script: 'y={x+2} over {3}`', w: px(5918), h: px(3025), size: 1100 / 75 },
    { script: 'x <`-3 && a', w: px(720), h: px(1237), size: 1000 / 75 },
  ])
})

// 시험용 zip: 항목마다 저장(0) 또는 deflate(8). CRC 는 읽지 않아 0
async function zip(entries: { name: string; text: string; deflate?: boolean }[]): Promise<Uint8Array> {
  const parts: BlobPart[] = []
  const central: Uint8Array<ArrayBuffer>[] = []
  let offset = 0
  for (const e of entries) {
    const name = new TextEncoder().encode(e.name)
    const raw = new TextEncoder().encode(e.text)
    const data = e.deflate
      ? new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer())
      : raw
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(8, e.deflate ? 8 : 0, true)
    local.setUint32(18, data.length, true)
    local.setUint32(22, raw.length, true)
    local.setUint16(26, name.length, true)
    const dir = new DataView(new ArrayBuffer(46))
    dir.setUint32(0, 0x02014b50, true)
    dir.setUint16(10, e.deflate ? 8 : 0, true)
    dir.setUint32(20, data.length, true)
    dir.setUint32(24, raw.length, true)
    dir.setUint16(28, name.length, true)
    dir.setUint32(42, offset, true)
    parts.push(new Uint8Array(local.buffer), name, data)
    central.push(new Uint8Array(dir.buffer), name)
    offset += 30 + name.length + data.length
  }
  const size = central.reduce((n, c) => n + c.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(10, entries.length, true)
  end.setUint32(12, size, true)
  end.setUint32(16, offset, true)
  return new Uint8Array(await new Blob([...parts, ...central, new Uint8Array(end.buffer)]).arrayBuffer())
}

it('HWPX(zip) 의 본문 구역을 번호 순서로 풀어 수식을 모은다 (저장·deflate 둘 다)', async () => {
  const hwpx = await zip([
    { name: 'mimetype', text: 'application/hwp+zip' },
    { name: 'Contents/section1.xml', text: eqXml('b', 720, 1237), deflate: true },
    { name: 'Contents/header.xml', text: eqXml('header', 720, 1237) },
    { name: 'Contents/section0.xml', text: eqXml('a', 720, 1237) },
  ])
  expect((await hwpxEquations(hwpx)).map((e) => e.script)).toEqual(['a', 'b'])
})

it('쪽마다 수식 상자를 모으고 기준선은 그 줄 높이의 85% 에 둔다 (줄 밖 수식은 수식 상자 85%)', () => {
  const trees = [
    {
      type: 'Page',
      children: [
        {
          type: 'TextLine',
          bbox: { x: 70, y: 300, w: 298, h: 20 },
          children: [{ type: 'TextRun', bbox: { x: 70, y: 300, w: 57, h: 20 } }, { type: 'Equation', bbox: { x: 128, y: 300, w: 79, h: 40 } }],
        },
      ],
    },
    { type: 'Page', children: [{ type: 'Cell', bbox: { x: 0, y: 0, w: 100, h: 100 }, children: [{ type: 'Equation', bbox: { x: 5, y: 10, w: 20, h: 20 } }] }] },
  ]
  const doc = { pageCount: () => 2, getPageRenderTree: (p: number) => JSON.stringify(trees[p]) }
  expect(equationBoxes(doc)).toEqual([[{ x: 128, y: 300, w: 79, h: 40, baseline: 317 }], [{ x: 5, y: 10, w: 20, h: 20, baseline: 27 }]])
})

const box = (x: number, w: number) => ({ x, y: 10, w, h: 16.5, baseline: 24 })
const eq = (script: string, w: number) => ({ script, w, h: 16.5, size: 14.67 })

it('쪽 수식 상자와 HWPX 수식을 순서대로 짝짓는다', () => {
  expect(pairEquations([[box(1, 30)], [], [box(2, 40)]], [eq('a', 30), eq('b', 40.4)])).toEqual([
    [{ ...box(1, 30), script: 'a', size: 14.67 }],
    [],
    [{ ...box(2, 40), script: 'b', size: 14.67 }],
  ])
})

// 다른 수식을 그 자리에 그리면 안 된다: 못 맞추면 그 문서는 rhwp 수식 그대로
it('수식 개수가 다르거나 저장 크기가 상자와 1px 넘게 다르면 짝짓지 않는다', () => {
  expect(pairEquations([[box(1, 30)]], [eq('a', 30), eq('b', 40)])).toBeNull()
  expect(pairEquations([[box(1, 30), box(2, 40)]], [eq('a', 40), eq('b', 30)])).toBeNull()
})

it('짝지은 수식의 rhwp 묶음(늘림 있는 것, 없는 것)만 쪽 그림에서 뺀다', () => {
  const svg =
    '<svg><text x="1" y="2">가</text>' +
    '<g transform="translate(127.9066,299.8133) scale(1.3884,1.0000)">\n<text>y</text>\n<line/>\n</g>\n' +
    '<g transform="translate(415.7466,238.7466)">\n<text>Y</text>\n</g>\n' +
    '<g transform="translate(600,700) scale(1.2,1.0000)">\n<text>z</text>\n</g></svg>'
  const page = [
    { x: 127.9, y: 299.8, w: 79, h: 40, baseline: 311, script: 'y', size: 14.67 },
    { x: 415.7, y: 238.7, w: 177, h: 16.5, baseline: 252, script: 'Y', size: 14.67 },
  ]
  expect(stripEquations(svg, page)).toBe(
    '<svg><text x="1" y="2">가</text>\n\n<g transform="translate(600,700) scale(1.2,1.0000)">\n<text>z</text>\n</g></svg>',
  )
})

// 글상자처럼 translate 묶음 안에 수식 묶음이 들어 있어도 바깥 묶음은 두고 수식만 뺀다
it('바깥 묶음 안의 수식 묶음도 뺀다', () => {
  const svg = '<g transform="translate(5,5)"><text>A</text><g transform="translate(127.9,299.8) scale(1.2,1)"><text>y</text></g><text>B</text></g>'
  const page = [{ x: 127.9, y: 299.8, w: 79, h: 40, baseline: 311, script: 'y', size: 14.67 }]
  expect(stripEquations(svg, page)).toBe('<g transform="translate(5,5)"><text>A</text><text>B</text></g>')
})

it('그린 수식이 상자보다 넓으면 상자 폭으로 줄이고, 좁으면 제 크기. 기준선을 놓을 자리에 맞춘다', () => {
  expect(eqTransform(80, 100, 15)).toBe('translate(0px, -12px) scale(0.8)')
  expect(eqTransform(80, 60, 15)).toBe('translate(0px, -15px) scale(1)')
})
