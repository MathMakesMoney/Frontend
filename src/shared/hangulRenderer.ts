// @rhwp/core 는 원본 시험지를 처음 펼칠 때만 불러온다 (WASM 이 커서)
let rhwp: Promise<typeof import('@rhwp/core')> | null = null
export function loadRhwp() {
  rhwp ??= (async () => {
    const [core, wasm] = await Promise.all([import('@rhwp/core'), import('@rhwp/core/rhwp_bg.wasm?url')])
    // rhwp 가 줄 나누기 계산에 쓰는 글자 폭 측정 (초기화 전에 등록해야 한다)
    const ctx = document.createElement('canvas').getContext('2d')!
    Object.assign(globalThis, {
      measureTextWidth: (font: string, text: string) => {
        ctx.font = font
        return ctx.measureText(text).width
      },
    })
    await core.default({ module_or_path: wasm.default })
    return core
  })()
  return rhwp
}

