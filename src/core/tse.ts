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

/**
 * Arquivo de resultado de um cargo numa abrangência: Brasil, estado ou município.
 * Desde 2024 o TSE publica o arquivo "unificado" (dados/…-u.json), que substituiu o
 * dados-simplificados/…-r.json de 2022.
 */
export function urlResultado(f: Fonte, eleicao: string, cargo: Cargo, uf: string, municipio?: string): string {
  const local = `${uf}${municipio ?? ''}`
  return `${f.base}/${f.ciclo}/${eleicao}/dados/${uf}/${local}-c${pad(cargo.codigo, 4)}-e${pad(eleicao, 6)}-u.json`
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
  /** Partido isolado ou federação que disputa as vagas (cargos de deputado). */
  grupo: string
}

/** Partido ou federação e quantas vagas leva pela contagem atual (cargos de deputado). */
export interface Grupo {
  id: string
  nome: string
  vagas: number
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
  /** Número de vagas em disputa (1 para presidente, 2 para senador em 2026, 70 deputados por SP…). */
  vagas: number
  /** Quociente eleitoral (cargos de deputado): votos válidos ÷ vagas. */
  quociente: number
  /** Vagas de cada partido/federação calculadas pelo TSE com a contagem atual. */
  grupos: Grupo[]
  candidatos: Candidato[]
}

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '')

/**
 * Junta todos os objetos de candidato do arquivo. No arquivo unificado eles ficam em
 * carg → agr (coligação ou partido isolado) → par (partido) → cand; guardamos de onde vieram.
 */
interface Contexto {
  partido: string
  coligacao: string
  grupo: string
}

function coletarCandidatos(node: unknown, ctx: Contexto, out: Candidato[], grupos: Grupo[]) {
  if (Array.isArray(node)) {
    for (const item of node) coletarCandidatos(item, ctx, out, grupos)
    return
  }
  if (!isObj(node)) return
  const ehCandidato = 'vap' in node && ('nm' in node || 'nmu' in node)
  if (ehCandidato) {
    const situacao = str(node.st)
    out.push({
      numero: str(node.n),
      nome: str(node.nmu) || str(node.nm),
      sq: str(node.sqcand),
      partido: str(node.sgp) || ctx.partido,
      coligacao: str(node.cc) || ctx.coligacao,
      votos: num(node.vap),
      pct: num(node.pvap),
      // A situação escrita manda: no resultado final o TSE marca e="s" também em quem vai ao
      // 2º turno. Sem situação escrita, vale o indicador e="s".
      eleito: situacao ? /^eleit/i.test(situacao) : str(node.e).toLowerCase() === 's',
      situacao,
      vice: viceDe(node),
      grupo: ctx.grupo,
    })
    return
  }
  // Um "agr" (agremiação) tem a lista de partidos: é quem disputa as vagas
  const ehGrupo = Array.isArray(node.par)
  if (ehGrupo && 'vag' in node) {
    grupos.push({ id: str(node.n), nome: str(node.com) || str(node.nm), vagas: num(node.vag) })
  }
  const filho = {
    partido: str(node.sg) || ctx.partido,
    // tp "c" = coligação; "i" = partido isolado (aí o nome do grupo é o do próprio partido)
    coligacao: str(node.tp) === 'c' && str(node.nm) ? str(node.nm) : ctx.coligacao,
    grupo: ehGrupo ? str(node.n) : ctx.grupo,
  }
  for (const v of Object.values(node)) {
    if (Array.isArray(v) || isObj(v)) coletarCandidatos(v, filho, out, grupos)
  }
}

function viceDe(c: Obj): string {
  const vs = c.vs
  if (!Array.isArray(vs)) return str(c.nv)
  return vs
    .filter(isObj)
    .map((v) => str(v.nmu) || str(v.nm))
    .filter(Boolean)
    .join(', ')
}

export function lerResultado(raw: unknown): Resultado {
  if (!isObj(raw)) throw new Error('Arquivo de resultado em formato inesperado.')
  const s = isObj(raw.s) ? raw.s : {}
  const e = isObj(raw.e) ? raw.e : {}
  const v = isObj(raw.v) ? raw.v : {}

  const candidatos: Candidato[] = []
  const grupos: Grupo[] = []
  coletarCandidatos(raw.cand ?? raw.carg ?? [], { partido: '', coligacao: '', grupo: '' }, candidatos, grupos)
  const carg = Array.isArray(raw.carg) && isObj(raw.carg[0]) ? raw.carg[0] : raw
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
    vagas: num(carg.nv),
    quociente: num(carg.qe),
    grupos: grupos.filter((g) => g.vagas > 0).sort((a, b) => b.vagas - a.vagas || a.nome.localeCompare(b.nome)),
    candidatos: unicos,
  }
}

// ---------- quem está se elegendo ----------

export type Situacao = 'eleito' | 'elegendo' | 'segundoTurno' | null

/** Cargos com 2º turno: quem passa de 50% dos válidos leva no 1º turno. */
const MAIORIA_ABSOLUTA: CargoId[] = ['presidente', 'governador']

/**
 * Situação de cada candidato se a apuração terminasse agora. Só faz sentido onde a vaga é
 * decidida: presidente no Brasil, os demais cargos no estado (nunca num município).
 * O resultado oficial do TSE ("Eleito", "2º turno") sempre prevalece sobre a projeção.
 */
export function projetarSituacao(r: Resultado, cargo: Cargo, decideAqui: boolean, turno = 1): Map<Candidato, Situacao> {
  const out = new Map<Candidato, Situacao>()
  for (const c of r.candidatos) {
    out.set(c, c.eleito ? 'eleito' : /2.?\s*turno/i.test(c.situacao) ? 'segundoTurno' : null)
  }
  if (!decideAqui || r.finalizado || r.apurado <= 0) return out

  const vagas = r.vagas || 1
  const marcar = (c: Candidato, s: Situacao) => {
    if (!out.get(c)) out.set(c, s)
  }
  const ordem = r.candidatos.filter((c) => c.votos > 0)

  if (cargo.proporcional) {
    if (r.grupos.length) {
      // Vagas de cada partido/federação (calculadas pelo TSE) vão para os mais votados dele
      for (const g of r.grupos) ordem.filter((c) => c.grupo === g.id).slice(0, g.vagas).forEach((c) => marcar(c, 'elegendo'))
    } else {
      ordem.slice(0, vagas).forEach((c) => marcar(c, 'elegendo'))
    }
    return out
  }

  const lider = ordem[0]
  if (!lider) return out
  if (MAIORIA_ABSOLUTA.includes(cargo.id) && turno === 1 && lider.pct <= 50) {
    ordem.slice(0, 2).forEach((c) => marcar(c, 'segundoTurno'))
  } else {
    ordem.slice(0, vagas).forEach((c) => marcar(c, 'elegendo'))
  }
  return out
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
  /** Pasta do ciclo eleitoral nos arquivos do TSE, ex.: "ele2026". */
  ciclo: string
  /** Código reservado para o 2º turno desta eleição (o TSE informa antes de listá-lo). */
  codigo2t: string
  /** Estados onde há disputa (só listados quando não é o Brasil todo, como no 2º turno). */
  ufs: string[]
}

/** Eleições listadas no arquivo de configuração do TSE (de todos os anos que ele trouxer). */
export function lerConfig(raw: unknown): { ciclo: string; eleicoes: Eleicao[] } {
  const eleicoes: Eleicao[] = []
  // Cada "pleito" do arquivo traz seu ciclo (ex.: suplementares de 2026 ainda são do ciclo ele2024)
  const visitar = (node: unknown, cicloPai: string) => {
    if (Array.isArray(node)) return node.forEach((n) => visitar(n, cicloPai))
    if (!isObj(node)) return
    const ciclo = /^ele\d{4}$/.test(str(node.c)) ? str(node.c) : cicloPai
    if (Array.isArray(node.e)) {
      for (const e of node.e) {
        if (!isObj(e) || !str(e.cd)) continue
        eleicoes.push({
          codigo: str(e.cd),
          nome: str(e.nm),
          turno: num(e.t) || 1,
          data: str(e.dt) || str(node.dt),
          ciclo,
          codigo2t: str(e.cdt2),
          ufs: (Array.isArray(e.abr) ? e.abr : [])
            .filter(isObj)
            .map((a) => str(a.cd).toLowerCase())
            .filter((uf) => uf && uf !== 'br'),
        })
      }
    }
    for (const v of Object.values(node)) if (Array.isArray(v) || isObj(v)) visitar(v, ciclo)
  }
  visitar(raw, '')
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
  /** Estados com disputa de governador neste turno (vazio = todos). */
  ufsEstadual: string[]
  /** O TSE ainda não listou este turno: só reservou os códigos. */
  previsto?: boolean
}

/**
 * 2º turno: sempre no último domingo de outubro (Constituição, art. 77). Usado enquanto o TSE
 * ainda não lista o 2º turno no arquivo de configuração.
 */
export function dataSegundoTurno(ano: number): string {
  const d = new Date(Date.UTC(ano, 9, 31))
  d.setUTCDate(31 - d.getUTCDay())
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

/**
 * Nas eleições gerais o TSE separa a eleição federal (presidente) da estadual (os demais cargos),
 * cada uma com seu código, em cada turno. Ex.: 2026 tem 6257/6259 no 1º turno e 6258/6260 no 2º.
 * Antes de listar o 2º turno o TSE já informa os códigos dele (cdt2): o turno entra como previsto.
 */
export function montarTurnos(eleicoes: Eleicao[]): Turno[] {
  const ordinarias = eleicoes.filter((e) => !/suplementar|nova elei|municipal/i.test(e.nome))
  const porTurno = new Map<number, Eleicao[]>()
  for (const e of ordinarias) porTurno.set(e.turno, [...(porTurno.get(e.turno) ?? []), e])

  const turnos: Turno[] = []
  for (const [turno, lista] of porTurno) {
    lista.sort((a, b) => Number(a.codigo) - Number(b.codigo))
    const federal = lista.find((e) => /federal/i.test(e.nome)) ?? lista[0]
    const estadual = lista.find((e) => /estadua/i.test(e.nome)) ?? lista.find((e) => e !== federal) ?? federal
    turnos.push({
      turno,
      data: federal.data,
      federal: federal.codigo,
      estadual: estadual.codigo,
      ufsEstadual: estadual.ufs,
    })
  }

  const primeiro = turnos.find((t) => t.turno === 1)
  const fed1 = ordinarias.find((e) => e.codigo === primeiro?.federal)
  const est1 = ordinarias.find((e) => e.codigo === primeiro?.estadual)
  if (primeiro && !porTurno.has(2) && fed1?.codigo2t) {
    const ano = Number(primeiro.data.slice(-4)) || new Date().getFullYear()
    turnos.push({
      turno: 2,
      data: dataSegundoTurno(ano),
      federal: fed1.codigo2t,
      estadual: est1?.codigo2t || fed1.codigo2t,
      ufsEstadual: [],
      previsto: true,
    })
  }
  return turnos.sort((a, b) => a.turno - b.turno)
}

// ---------- andamento por estado ----------

export interface AndamentoUf {
  /** Sigla em minúsculas; "zz" = exterior, "br" = Brasil. */
  uf: string
  apurado: number
  secoes: number
  secoesTotalizadas: number
}

/** Arquivo de acompanhamento: % de urnas apuradas de cada estado, num arquivo só. */
export const urlAndamento = (f: Fonte, eleicao: string) =>
  `${f.base}/${f.ciclo}/${eleicao}/dados/br/br-e${pad(eleicao, 6)}-ab.json`

export function lerAndamento(raw: unknown): { atualizado: string; ufs: AndamentoUf[] } {
  if (!isObj(raw) || !Array.isArray(raw.abr)) throw new Error('Arquivo de acompanhamento em formato inesperado.')
  const ufs = raw.abr.filter(isObj).map((a) => {
    const s = isObj(a.s) ? a.s : {}
    return { uf: str(a.cdabr).toLowerCase(), apurado: num(s.pst), secoes: num(s.ts), secoesTotalizadas: num(s.st) }
  })
  return { atualizado: [str(raw.dg), str(raw.hg)].filter(Boolean).join(' '), ufs }
}

// ---------- regiões ----------

export interface Regiao {
  id: string
  nome: string
  ufs: string[]
  /** Onde escrever o nome no mapa (coordenadas do SVG dos estados). */
  rotulo: [number, number]
}

export const REGIOES: Regiao[] = [
  { id: 'norte', nome: 'Norte', ufs: ['ac', 'am', 'ap', 'pa', 'ro', 'rr', 'to'], rotulo: [200, 150] },
  { id: 'nordeste', nome: 'Nordeste', ufs: ['al', 'ba', 'ce', 'ma', 'pb', 'pe', 'pi', 'rn', 'se'], rotulo: [515, 235] },
  { id: 'centro-oeste', nome: 'Centro-Oeste', ufs: ['df', 'go', 'ms', 'mt'], rotulo: [300, 330] },
  { id: 'sudeste', nome: 'Sudeste', ufs: ['es', 'mg', 'rj', 'sp'], rotulo: [450, 410] },
  { id: 'sul', nome: 'Sul', ufs: ['pr', 'rs', 'sc'], rotulo: [335, 560] },
]

export const regiaoDaUf = (uf: string) => REGIOES.find((r) => r.ufs.includes(uf))

/**
 * % apurada de cada região: soma as seções dos estados (não a média das %, que daria
 * o mesmo peso a Roraima e a São Paulo).
 */
export function andamentoPorRegiao(ufs: AndamentoUf[]): (AndamentoUf & { nome: string })[] {
  return REGIOES.map((r) => {
    const dela = ufs.filter((u) => r.ufs.includes(u.uf))
    const secoes = dela.reduce((t, u) => t + u.secoes, 0)
    const secoesTotalizadas = dela.reduce((t, u) => t + u.secoesTotalizadas, 0)
    return { uf: r.id, nome: r.nome, secoes, secoesTotalizadas, apurado: secoes ? (secoesTotalizadas / secoes) * 100 : 0 }
  })
}
