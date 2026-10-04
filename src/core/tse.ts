/**
 * Leitura dos arquivos públicos de resultados do TSE (resultados.tse.jus.br), os mesmos usados
 * pelo app "Resultados" oficial. São arquivos JSON estáticos, atualizados durante a apuração.
 *
 * O formato não tem documentação oficial e muda um pouco a cada eleição, então a leitura é
 * tolerante: procura os campos conhecidos onde quer que estejam e ignora o resto.
 */

export const TSE_BASE = 'https://resultados.tse.jus.br/oficial'

export type CargoId = 'presidente' | 'governador' | 'senador' | 'depFederal' | 'depEstadual' | 'depDistrital'

export interface Cargo {
  id: CargoId
  /** Código do cargo nos arquivos do TSE. */
  codigo: number
  nome: string
  /** Eleição federal (presidente) ou estadual (os demais), que no TSE têm códigos diferentes. */
  esfera: 'federal' | 'estadual'
  /** Tem resultado nacional (Brasil inteiro). */
  nacional: boolean
  /** Eleição proporcional: lista longa de candidatos, sem 2º turno. */
  proporcional: boolean
}

export const CARGOS: Cargo[] = [
  { id: 'presidente', codigo: 1, nome: 'Presidente', esfera: 'federal', nacional: true, proporcional: false },
  { id: 'governador', codigo: 3, nome: 'Governador', esfera: 'estadual', nacional: false, proporcional: false },
  { id: 'senador', codigo: 5, nome: 'Senador', esfera: 'estadual', nacional: false, proporcional: false },
  { id: 'depFederal', codigo: 6, nome: 'Dep. Federal', esfera: 'estadual', nacional: false, proporcional: true },
  { id: 'depEstadual', codigo: 7, nome: 'Dep. Estadual', esfera: 'estadual', nacional: false, proporcional: true },
  { id: 'depDistrital', codigo: 8, nome: 'Dep. Distrital', esfera: 'estadual', nacional: false, proporcional: true },
]

export const cargoPorId = (id: CargoId): Cargo => CARGOS.find((c) => c.id === id)!

/** Deputado estadual não existe no DF, e deputado distrital só existe no DF. */
export function cargoExiste(cargo: Cargo, uf: string): boolean {
  if (cargo.id === 'depDistrital') return uf === 'df'
  if (cargo.id === 'depEstadual') return uf !== 'df'
  if (!cargo.nacional) return uf !== 'br'
  return true
}

export const UFS: { sigla: string; nome: string }[] = [
  ['ac', 'Acre'], ['al', 'Alagoas'], ['ap', 'Amapá'], ['am', 'Amazonas'], ['ba', 'Bahia'], ['ce', 'Ceará'],
  ['df', 'Distrito Federal'], ['es', 'Espírito Santo'], ['go', 'Goiás'], ['ma', 'Maranhão'],
  ['mt', 'Mato Grosso'], ['ms', 'Mato Grosso do Sul'], ['mg', 'Minas Gerais'], ['pa', 'Pará'],
  ['pb', 'Paraíba'], ['pr', 'Paraná'], ['pe', 'Pernambuco'], ['pi', 'Piauí'], ['rj', 'Rio de Janeiro'],
  ['rn', 'Rio Grande do Norte'], ['rs', 'Rio Grande do Sul'], ['ro', 'Rondônia'], ['rr', 'Roraima'],
  ['sc', 'Santa Catarina'], ['sp', 'São Paulo'], ['se', 'Sergipe'], ['to', 'Tocantins'],
].map(([sigla, nome]) => ({ sigla, nome }))

// ---------- números ----------

/** O TSE manda números como texto, com vírgula decimal ("50,90") e às vezes ponto de milhar. */
export function num(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v !== 'string' || v.trim() === '') return 0
  let s = v.trim()
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

const pad = (n: number | string, size: number) => String(n).padStart(size, '0')

// ---------- endereços ----------

export interface Fonte {
  /** Ex.: https://resultados.tse.jus.br/oficial */
  base: string
  /** Ex.: ele2026 */
  ciclo: string
}

/** Arquivo de resultado de um cargo numa abrangência: Brasil, estado ou município. */
export function urlResultado(f: Fonte, eleicao: string, cargo: Cargo, uf: string, municipio?: string): string {
  const local = `${uf}${municipio ?? ''}`
  return `${f.base}/${f.ciclo}/${eleicao}/dados-simplificados/${uf}/${local}-c${pad(cargo.codigo, 4)}-e${pad(eleicao, 6)}-r.json`
}

export const urlMunicipios = (f: Fonte, eleicao: string) =>
  `${f.base}/${f.ciclo}/${eleicao}/config/mun-e${pad(eleicao, 6)}-cm.json`

export const urlConfig = (f: Fonte) => `${f.base}/comum/config/ele-c.json`

export const urlFoto = (f: Fonte, eleicao: string, uf: string, sqcand: string) =>
  `${f.base}/${f.ciclo}/${eleicao}/fotos/${uf}/${sqcand}.jpeg`

// ---------- resultado ----------

export interface Candidato {
  /** Número de urna. */
  numero: string
  nome: string
  /** Sequencial do candidato no TSE (usado na foto). */
  sq: string
  partido: string
  coligacao: string
  votos: number
  /** % dos votos válidos. */
  pct: number
  eleito: boolean
  /** Situação informada pelo TSE: "Eleito", "2º turno", "Eleito por QP", "Suplente"… */
  situacao: string
  /** Vice ou suplentes, quando informados. */
  vice: string
}

export interface Resultado {
  /** % de seções totalizadas (urnas apuradas). */
  apurado: number
  secoes: number
  secoesTotalizadas: number
  eleitores: number
  comparecimento: number
  pctComparecimento: number
  abstencao: number
  pctAbstencao: number
  validos: number
  brancos: number
  pctBrancos: number
  nulos: number
  pctNulos: number
  /** Data e hora da última totalização, como o TSE informa ("04/10/2026 19:32:10"). */
  atualizado: string
  /** O TSE marca quando a totalização chegou ao fim ("s"). */
  finalizado: boolean
  candidatos: Candidato[]
}

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '')

/** Junta todos os objetos de candidato do arquivo, guardando o partido de onde estavam aninhados. */
function coletarCandidatos(node: unknown, partido: string, out: Candidato[]) {
  if (Array.isArray(node)) {
    for (const item of node) coletarCandidatos(item, partido, out)
    return
  }
  if (!isObj(node)) return
  // Nos arquivos de cargos proporcionais os candidatos ficam dentro de partido/federação
  const sigla = str(node.sg) || partido
  const ehCandidato = 'vap' in node && ('nm' in node || 'nmu' in node)
  if (ehCandidato) {
    const situacao = str(node.st)
    out.push({
      numero: str(node.n),
      nome: str(node.nmu) || str(node.nm),
      sq: str(node.sqcand),
      partido: str(node.sgp) || sigla,
      coligacao: str(node.cc),
      votos: num(node.vap),
      pct: num(node.pvap),
      eleito: str(node.e).toLowerCase() === 's' || /^eleit/i.test(situacao),
      situacao,
      vice: viceDe(node),
    })
    return
  }
  for (const v of Object.values(node)) {
    if (Array.isArray(v) || isObj(v)) coletarCandidatos(v, sigla, out)
  }
}

function viceDe(c: Obj): string {
  const vs = c.vs
  if (!Array.isArray(vs)) return str(c.nv)
  return vs
    .filter(isObj)
    .map((v) => str(v.nm))
    .filter(Boolean)
    .join(', ')
}

export function lerResultado(raw: unknown): Resultado {
  if (!isObj(raw)) throw new Error('Arquivo de resultado em formato inesperado.')
  const s = isObj(raw.s) ? raw.s : {}
  const e = isObj(raw.e) ? raw.e : {}
  const v = isObj(raw.v) ? raw.v : {}

  const candidatos: Candidato[] = []
  coletarCandidatos(raw.cand ?? raw.carg ?? [], '', candidatos)
  // Mesmo candidato pode aparecer duas vezes se o arquivo repetir a lista agrupada
  const unicos = [...new Map(candidatos.map((c) => [c.sq || `${c.numero}|${c.nome}`, c])).values()]
  unicos.sort((a, b) => b.votos - a.votos || a.nome.localeCompare(b.nome))

  const validos = num(v.vv) || unicos.reduce((t, c) => t + c.votos, 0)
  // Alguns arquivos não trazem o % por candidato; calcula a partir dos válidos
  if (validos > 0) for (const c of unicos) if (!c.pct && c.votos) c.pct = (c.votos / validos) * 100

  return {
    apurado: num(s.pst),
    secoes: num(s.ts),
    secoesTotalizadas: num(s.st),
    eleitores: num(e.te),
    comparecimento: num(e.c),
    pctComparecimento: num(e.pc),
    abstencao: num(e.a),
    pctAbstencao: num(e.pa),
    validos,
    brancos: num(v.vb),
    pctBrancos: num(v.pvb),
    nulos: num(v.tvn) || num(v.vn),
    pctNulos: num(v.ptvn) || num(v.pvn),
    atualizado: [str(raw.dg), str(raw.hg)].filter(Boolean).join(' '),
    finalizado: str(raw.tf).toLowerCase() === 's',
    candidatos: unicos,
  }
}

// ---------- municípios ----------

export interface Municipio {
  /** Código do município no TSE (5 dígitos, diferente do IBGE). */
  codigo: string
  nome: string
  uf: string
  capital: boolean
}

export function lerMunicipios(raw: unknown): Municipio[] {
  const out: Municipio[] = []
  const abr = isObj(raw) && Array.isArray(raw.abr) ? raw.abr : []
  for (const estado of abr) {
    if (!isObj(estado) || !Array.isArray(estado.mu)) continue
    const uf = str(estado.cd).toLowerCase()
    for (const m of estado.mu) {
      if (!isObj(m)) continue
      out.push({ codigo: pad(str(m.cd), 5), nome: titulo(str(m.nm)), uf, capital: str(m.c).toUpperCase() === 'S' })
    }
  }
  return out.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

const MINUSCULAS = new Set(['da', 'das', 'de', 'do', 'dos', 'e'])

/** "SÃO JOÃO DO RIO PRETO" → "São João do Rio Preto" */
export function titulo(s: string): string {
  return s
    .toLowerCase()
    .split(/(\s+)/)
    .map((w, i) => (i > 0 && MINUSCULAS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join('')
}

// ---------- eleições disponíveis ----------

export interface Eleicao {
  codigo: string
  nome: string
  turno: number
  /** Ex.: "04/10/2026" */
  data: string
}

/** Eleições listadas no arquivo de configuração do TSE (de todos os anos que ele trouxer). */
export function lerConfig(raw: unknown): { ciclo: string; eleicoes: Eleicao[] } {
  const eleicoes: Eleicao[] = []
  const visitar = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(visitar)
    if (!isObj(node)) return
    if (Array.isArray(node.e)) {
      for (const e of node.e) {
        if (!isObj(e) || !str(e.cd)) continue
        eleicoes.push({
          codigo: str(e.cd),
          nome: str(e.nm),
          turno: num(e.t) || 1,
          data: str(e.dt) || str(node.dt),
        })
      }
    }
    for (const v of Object.values(node)) if (Array.isArray(v) || isObj(v)) visitar(v)
  }
  visitar(raw)
  const ciclo = isObj(raw) ? str(raw.c) : ''
  return { ciclo, eleicoes: [...new Map(eleicoes.map((e) => [e.codigo, e])).values()] }
}

export interface Turno {
  turno: number
  data: string
  /** Código da eleição de presidente. */
  federal: string
  /** Código da eleição de governador, senador e deputados. */
  estadual: string
}

/**
 * Nas eleições gerais o TSE separa a eleição federal (presidente) da estadual (os demais cargos),
 * cada uma com seu código, em cada turno. Ex.: 2022 teve 544/546 no 1º turno e 545/547 no 2º.
 */
export function montarTurnos(eleicoes: Eleicao[]): Turno[] {
  const ordinarias = eleicoes.filter((e) => !/suplementar|nova elei/i.test(e.nome))
  const porTurno = new Map<number, Eleicao[]>()
  for (const e of ordinarias) porTurno.set(e.turno, [...(porTurno.get(e.turno) ?? []), e])

  const turnos: Turno[] = []
  for (const [turno, lista] of porTurno) {
    lista.sort((a, b) => Number(a.codigo) - Number(b.codigo))
    const federal = lista.find((e) => /federal/i.test(e.nome)) ?? lista[0]
    const estadual = lista.find((e) => /estadua/i.test(e.nome)) ?? lista.find((e) => e !== federal) ?? federal
    turnos.push({ turno, data: federal.data, federal: federal.codigo, estadual: estadual.codigo })
  }
  return turnos.sort((a, b) => a.turno - b.turno)
}
