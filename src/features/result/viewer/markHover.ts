interface Marked {
  dataset: { label?: string }
  classList: { toggle(cls: string, on: boolean): unknown }
}

// root 안 [data-label] 요소 중 hovered 와 같은 것에만 옅은 네모 클래스를 붙이고 나머지는 뗀다
export function markHover(root: { querySelectorAll(sel: string): Iterable<Marked> }, hovered: string | null) {
  for (const el of root.querySelectorAll('[data-label]')) el.classList.toggle('academy-hover', el.dataset.label === hovered)
}
