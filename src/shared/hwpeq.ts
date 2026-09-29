// 한글(HWP) 수식 스크립트를 KaTeX 가 읽는 LaTeX 로 바꾼다. 모르는 단어는 글자 그대로 둔다

interface Token {
  t: string
  spaceBefore: boolean
  spaceAfter: boolean
}

// 조각 하나. group 이면 바깥 {} 를 뺀 속을 inner 에 둔다 (분수·첨자 인자로 쓸 때)
interface Atom {
  s: string
  inner?: string
  sup?: boolean
  sub?: boolean
}

type Font = '' | 'rm' | 'bold'
// matrix: # 는 줄, & 는 칸. matrix2: ## 가 있으면 ## 는 줄, # 와 & 는 칸
type Mode = 'plain' | 'matrix' | 'matrix2'

const GREEK = [
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu',
  'nu', 'xi', 'omicron', 'pi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega',
  'varepsilon', 'vartheta', 'varpi', 'varrho', 'varsigma', 'varphi',
]
const UPPER_GREEK = ['gamma', 'delta', 'theta', 'lambda', 'xi', 'pi', 'sigma', 'upsilon', 'phi', 'psi', 'omega']

// 그리스 문자는 대소문자를 구분한다 (pi 는 소문자, PI 는 대문자)
const GREEK_MAP: Record<string, string> = {}
for (const g of GREEK) GREEK_MAP[g] = `\\${g}`
for (const g of UPPER_GREEK) GREEK_MAP[g.toUpperCase()] = `\\${g[0].toUpperCase()}${g.slice(1)}`
GREEK_MAP.omicron = 'o'

// 기호 하나로 바뀌는 단어. 세 글자 이상은 대소문자를 가리지 않는다 (OVER, over)
const SYMBOLS: Record<string, string> = {
  times: '\\times', cdot: '\\cdot', div: '\\div', pm: '\\pm', mp: '\\mp', circ: '\\circ', bullet: '\\bullet',
  angle: '\\angle', triangle: '\\triangle', bot: '\\perp', perp: '\\perp', parallel: '\\parallel',
  therefore: '\\therefore', because: '\\because', inf: '\\infty', infty: '\\infty', partial: '\\partial',
  nabla: '\\nabla', emptyset: '\\emptyset', forall: '\\forall', exist: '\\exists', exists: '\\exists',
  cdots: '\\cdots', ldots: '\\ldots', vdots: '\\vdots', ddots: '\\ddots', dots: '\\dots',
  sim: '\\sim', simeq: '\\simeq', approx: '\\approx', cong: '\\cong', equiv: '\\equiv',
  neq: '\\neq', ne: '\\neq', geq: '\\geq', ge: '\\geq', leq: '\\leq', le: '\\leq', gg: '\\gg', ll: '\\ll',
  in: '\\in', IN: '\\in', notin: '\\notin', ni: '\\ni', owns: '\\ni',
  subset: '\\subset', supset: '\\supset', superset: '\\supset', subseteq: '\\subseteq', supseteq: '\\supseteq',
  supersetEQ: '\\supseteq', smallinter: '\\cap', cap: '\\cap', smallunion: '\\cup', cup: '\\cup',
  rarrow: '\\rightarrow', larrow: '\\leftarrow', lrarrow: '\\leftrightarrow', uparrow: '\\uparrow', downarrow: '\\downarrow',
  RARROW: '\\Rightarrow', LARROW: '\\Leftarrow', LRARROW: '\\Leftrightarrow',
  prime: "'", propto: '\\propto', varpropto: '\\varpropto', aleph: '\\aleph', hbar: '\\hbar',
  sum: '\\sum', int: '\\int', dint: '\\iint', tint: '\\iiint', oint: '\\oint', prod: '\\prod',
  union: '\\bigcup', inter: '\\bigcap', coprod: '\\coprod',
  sin: '\\sin', cos: '\\cos', tan: '\\tan', cot: '\\cot', sec: '\\sec', csc: '\\csc', log: '\\log', ln: '\\ln',
  lg: '\\lg', exp: '\\exp', lim: '\\lim', max: '\\max', min: '\\min', det: '\\det', gcd: '\\gcd',
  arcsin: '\\arcsin', arccos: '\\arccos', arctan: '\\arctan', sinh: '\\sinh', cosh: '\\cosh', tanh: '\\tanh',
}

// 뒤 한 덩어리를 감싸는 단어
const PREFIX: Record<string, string> = {
  sqrt: '\\sqrt', overline: '\\overline', underline: '\\underline', under: '\\underline', bar: '\\bar',
  hat: '\\hat', tilde: '\\tilde', vec: '\\vec', dyad: '\\overleftrightarrow', arch: '\\overgroup',
  overrightarrow: '\\overrightarrow', overleftarrow: '\\overleftarrow', dot: '\\dot', ddot: '\\ddot',
  acute: '\\acute', grave: '\\grave', check: '\\check',
}

const ENVS: Record<string, string> = {
  matrix: 'matrix', pmatrix: 'pmatrix', bmatrix: 'bmatrix', dmatrix: 'vmatrix', cases: 'cases',
  pile: 'matrix', lpile: 'matrix', rpile: 'matrix',
}

// 단어 하나로 쓰이는 문자 (유니코드 기호 포함)
const CHARS: Record<string, string> = {
  '#': '\\#', '%': '\\%', '&': '\\&', $: '\\$', '\\': '\\backslash', '`': '\\,', '~': '\\ ',
  '+-': '\\pm', '-+': '\\mp', '->': '\\to', '<=': '\\leq', '>=': '\\geq', '!=': '\\neq',
  '±': '\\pm', '∓': '\\mp', '≠': '\\neq', '→': '\\to', '←': '\\leftarrow', '∞': '\\infty', '≤': '\\leq',
  '≥': '\\geq', '×': '\\times', '·': '\\cdot', '÷': '\\div', '∈': '\\in', '∠': '\\angle', '△': '\\triangle',
  '⊥': '\\perp', '∥': '\\parallel', '∴': '\\therefore', '′': "'", '…': '\\ldots', '⋯': '\\cdots',
}

// aLEFT 처럼 붙여 쓴 LEFT, RIGHT 는 떼어 읽는다
const TOKEN = /"[^"]*"?|[A-Za-z]+?(?=(?:LEFT|RIGHT)(?![A-Za-z]))|[A-Za-z]+|\d+(?:\.\d+)?|[가-힣ㄱ-ㅎㅏ-ㅣ]+|\+-|-\+|->|<=|>=|!=|##|\S/gu
const HANGUL = /^[가-힣ㄱ-ㅎㅏ-ㅣ]/u
const SPACE = /\s/

// 세 글자 이상 단어는 소문자로도 찾는다. 그리스 문자는 정확히 맞을 때만
function keyword(word: string): string {
  if (word in GREEK_MAP || word in SYMBOLS || word in PREFIX || word in ENVS) return word
  const lower = word.toLowerCase()
  return word.length >= 3 && !(lower in GREEK_MAP) ? lower : word
}

// 기호로 바뀌지 않는 영문 단어나 숫자
function isPlainWord(t: string): boolean {
  if (/^\d/.test(t)) return true
  if (!/^[A-Za-z]+$/.test(t)) return false
  const kw = keyword(t)
  return !(kw in GREEK_MAP || kw in SYMBOLS || kw in PREFIX || kw in ENVS || ['rm', 'it', 'bold', 'left', 'right', 'over', 'root'].includes(kw))
}

function escapeText(s: string): string {
  return s.replace(/[\\{}#%&$^_~]/g, (c) => (c === '\\' ? '\\textbackslash{}' : `\\${c}`))
}

function tokenize(script: string): Token[] {
  const tokens: Token[] = []
  for (const m of script.matchAll(TOKEN)) {
    const start = m.index ?? 0
    const end = start + m[0].length
    tokens.push({
      t: m[0],
      spaceBefore: start > 0 && SPACE.test(script[start - 1]),
      spaceAfter: end < script.length && SPACE.test(script[end]),
    })
  }
  return tokens
}

class Parser {
  pos = 0
  constructor(readonly tokens: Token[]) {}

  peek(): string | undefined {
    return this.tokens[this.pos]?.t
  }

  // 조각을 차례로 읽는다. } 나 끝, (stopAtRight 면) RIGHT 에서 멈춘다
  seq(mode: Mode, stopAtRight: boolean): Atom[] {
    const atoms: Atom[] = []
    let font: Font = ''
    while (this.pos < this.tokens.length) {
      const t = this.peek()!
      const kw = /^[A-Za-z]+$/.test(t) ? keyword(t) : t
      if (t === '}') break
      if (kw === 'right' && stopAtRight) break
      if (t === '^' || t === '_' || kw === 'sup' || kw === 'sub') {
        this.pos++
        this.attach(atoms, t === '^' || kw === 'sup' ? '^' : '_', this.argOf(this.primary(mode, font)))
      } else if (t === '°' || kw === 'deg') {
        this.pos++
        this.attach(atoms, '^', '\\circ')
      } else if (kw === 'over' || kw === 'atop') {
        this.pos++
        const left = atoms.pop() ?? { s: '' }
        const right = this.withScripts(this.primary(mode, font), mode, font)
        const [a, b] = [this.argOf(left), this.argOf(right)]
        atoms.push({ s: kw === 'over' ? `\\frac{${a}}{${b}}` : `{${a} \\atop ${b}}` })
      } else if (kw === 'rm' || kw === 'it' || kw === 'bold') {
        this.pos++
        font = kw === 'it' ? '' : kw
      } else if (mode !== 'plain' && (t === '#' || t === '##' || t === '&')) {
        this.pos++
        const row = t === '##' || (t === '#' && mode === 'matrix')
        atoms.push({ s: row ? '\\\\' : '&' })
      } else {
        const atom = this.primary(mode, font)
        if (atom) atoms.push(atom)
      }
    }
    return atoms
  }

  // 첨자가 이어지면 붙여서 한 덩어리로 (over 오른쪽)
  withScripts(atom: Atom | null, mode: Mode, font: Font): Atom | null {
    const holder = atom ? [atom] : []
    while (this.peek() === '^' || this.peek() === '_') {
      const op = this.peek() as '^' | '_'
      this.pos++
      this.attach(holder, op, this.argOf(this.primary(mode, font)))
    }
    return holder[0] ?? atom
  }

  attach(atoms: Atom[], op: '^' | '_', arg: string) {
    const last = atoms.pop() ?? { s: '{}' }
    const key = op === '^' ? 'sup' : 'sub'
    const base = last[key] ? `{${last.s}}` : last.s
    atoms.push({ s: `${base}${op}{${arg}}`, sup: key === 'sup' || (last.sup && !last[key]), sub: key === 'sub' || (last.sub && !last[key]) })
  }

  argOf(atom: Atom | null): string {
    if (!atom) return ''
    return atom.inner ?? atom.s
  }

  // 조각 하나를 읽는다. 글꼴 전환처럼 조각이 없으면 null
  primary(mode: Mode, font: Font): Atom | null {
    const tok = this.tokens[this.pos]
    if (!tok) return null
    this.pos++
    const t = tok.t
    if (t === '{') {
      const inner = this.join(this.seq('plain', false))
      if (this.peek() === '}') this.pos++
      return { s: `{${inner}}`, inner }
    }
    if (t === '}') return null
    if (t.startsWith('"')) return { s: `\\text{${escapeText(t.replace(/^"|"$/g, ''))}}` }
    if (HANGUL.test(t)) {
      // 한글끼리, 한글과 글자·숫자 사이 띄어쓰기만 살린다
      const prev = this.tokens[this.pos - 2]?.t ?? ''
      const next = this.tokens[this.pos]?.t ?? ''
      const lead = tok.spaceBefore && HANGUL.test(prev) ? ' ' : ''
      const trail = tok.spaceAfter && isPlainWord(next) ? ' ' : ''
      return { s: `\\text{${lead}${t}${trail}}` }
    }
    if (/^[A-Za-z]+$/.test(t)) return this.word(t, mode, font)
    if (t in CHARS) return { s: CHARS[t] }
    if (/^[\u0391-\u03c9]/.test(t)) return { s: t }
    if (/^[^\x00-\x7f]/.test(t)) return { s: `\\text{${escapeText(t)}}` }
    return { s: t }
  }

  word(t: string, mode: Mode, font: Font): Atom | null {
    const kw = keyword(t)
    if (kw in GREEK_MAP) return { s: GREEK_MAP[kw] }
    if (kw in SYMBOLS) return { s: SYMBOLS[kw] }
    if (kw in PREFIX) return { s: `${PREFIX[kw]}{${this.argOf(this.primary(mode, font))}}` }
    if (kw in ENVS) {
      const env = ENVS[kw]
      if (this.peek() !== '{') return { s: t }
      this.pos++
      const inner = this.join(this.seq(this.hasDoubleHash() ? 'matrix2' : 'matrix', false))
      if (this.peek() === '}') this.pos++
      return { s: `\\begin{${env}}${inner}\\end{${env}}` }
    }
    if (kw === 'root') {
      const index = this.argOf(this.primary(mode, font))
      if (this.peek() && keyword(this.peek()!) === 'of') this.pos++
      return { s: `\\sqrt[${index}]{${this.argOf(this.primary(mode, font))}}` }
    }
    if (kw === 'left') {
      const open = this.delim()
      const inner = this.join(this.seq(mode, true))
      // RIGHT 가 없으면 \right. 로 닫는다
      const close = this.peek() && keyword(this.peek()!) === 'right' ? (this.pos++, this.delim()) : '.'
      return { s: ['\\left' + open, inner, '\\right' + close].filter(Boolean).join(' ') }
    }
    if (kw === 'right') {
      const d = this.delim()
      return d === '.' ? null : { s: d }
    }
    if (font === 'rm') return { s: `\\mathrm{${t}}` }
    if (font === 'bold') return { s: `\\mathbf{${t}}` }
    return { s: t }
  }

  // LEFT, RIGHT 뒤 괄호 한 개
  delim(): string {
    const t = this.tokens[this.pos]?.t
    const map: Record<string, string> = {
      '{': '\\{', '}': '\\}', '<': '\\langle', '>': '\\rangle', vert: '|', line: '|', dline: '\\|',
      lfloor: '\\lfloor', rfloor: '\\rfloor', lceil: '\\lceil', rceil: '\\rceil',
    }
    // 괄호가 아닌 단어면 먹지 않고 보이지 않는 괄호로 둔다
    if (t === undefined || (/^[A-Za-z]+$/.test(t) && !(keyword(t) in map))) return '.'
    this.pos++
    return map[keyword(t)] ?? t
  }

  // 현재 { 부터 짝 맞는 } 까지 ## 가 있는지
  hasDoubleHash(): boolean {
    let depth = 0
    for (let i = this.pos; i < this.tokens.length; i++) {
      const t = this.tokens[i].t
      if (t === '{') depth++
      else if (t === '}' && depth-- === 0) return false
      else if (t === '##' && depth === 0) return true
    }
    return false
  }

  join(atoms: Atom[]): string {
    // 이어진 프라임은 붙여 쓴다 (' ' 는 KaTeX 가 이중 위첨자 오류로 본다)
    return atoms.map((a) => a.s).join(' ').replace(/'(?: ')+/g, (m) => m.replace(/ /g, ''))
  }
}

export function toLatex(script: string): string {
  const parser = new Parser(tokenize(script))
  const out: Atom[] = []
  // 짝 없는 } 는 건너뛰고 계속 읽는다
  while (parser.pos < parser.tokens.length) {
    out.push(...parser.seq('plain', false))
    if (parser.peek() === '}') parser.pos++
  }
  return parser.join(out)
}
