/**
 * Modo demonstração: apuração FICTÍCIA, no mesmo formato dos arquivos do TSE, para ver o app
 * funcionando fora do dia da eleição (ou quando o site do TSE não responde).
 * Os nomes são inventados e não representam candidatos reais.
 */
import type { Cargo, Municipio } from './tse'
import { UFS } from './tse'

const NOMES = [
  'Ana Ribeiro', 'Bruno Carvalho', 'Carla Mendes', 'Diego Moura', 'Elisa Prado', 'Fábio Teles',
  'Gabriela Rocha', 'Heitor Lins', 'Iara Fontes', 'João Vidal', 'Karen Duarte', 'Lucas Brandão',
  'Marina Assis', 'Nelson Paiva', 'Olívia Matos', 'Paulo Sena', 'Quitéria Lopes', 'Rafael Nunes',
  'Sílvia Castro', 'Tiago Amaral', 'Úrsula Pires', 'Vítor Campos', 'Wanda Lima', 'Xavier Reis',
  'Yara Bastos', 'Zeca Moraes',
]
const PARTIDOS = ['PFA', 'PFB', 'PFC', 'PFD', 'PFE', 'PFF', 'PFG', 'PFH']

/** PRNG com semente: o mesmo lugar e cargo sempre gera os mesmos candidatos. */
function prng(seed: string) {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

const inicio = Date.now()

/** A apuração de mentira vai de ~30% a 100% em 8 minutos. */
export function progressoDemo(agora = Date.now()): number {
  return Math.min(100, 30 + ((agora - inicio) / 60000) * (70 / 8))
}

const fmt = (n: number) => n.toFixed(2).replace('.', ',')

export function resultadoDemo(cargo: Cargo, uf: string, municipio: string | undefined, agora = Date.now()): unknown {
  const rnd = prng(`${cargo.id}|${uf}|${municipio ?? ''}`)
  const n = cargo.proporcional ? 40 : cargo.id === 'presidente' ? 8 : 5
  const pesos = Array.from({ length: n }, (_, i) => (cargo.proporcional ? 1 / (i + 1.5) : Math.pow(rnd(), 2) + 0.05))
  const soma = pesos.reduce((a, b) => a + b, 0)

  const pst = progressoDemo(agora)
  const eleitoresBase = municipio ? 50_000 + rnd() * 400_000 : uf === 'br' ? 156_000_000 : 2_000_000 + rnd() * 20_000_000
  const eleitores = Math.round(eleitoresBase)
  // Comparecimento e abstenção valem para as seções já apuradas
  const aptosApurados = Math.round(eleitores * (pst / 100))
  const comparecimento = Math.round(aptosApurados * 0.79)
  const brancos = Math.round(comparecimento * 0.02)
  const nulos = Math.round(comparecimento * 0.035)
  const validos = comparecimento - brancos - nulos
  // Pequena oscilação ao longo da apuração, como acontece com as urnas de cada região
  const deriva = (i: number) => 1 + Math.sin(pst / 12 + i) * 0.04

  const brutos = pesos.map((p, i) => (p / soma) * deriva(i))
  const total = brutos.reduce((a, b) => a + b, 0)
  const votos = brutos.map((b) => Math.round((b / total) * validos))

  // Embaralha os nomes para não repetir candidato
  const nomes = [...NOMES].sort(() => rnd() - 0.5)
  const cand = votos.map((v, i) => {
    const nome = nomes[i % nomes.length] + (cargo.proporcional && i >= nomes.length ? ` ${Math.floor(i / nomes.length) + 1}` : '')
    const partido = PARTIDOS[i % PARTIDOS.length]
    return {
      seq: String(i + 1),
      sqcand: '',
      n: String(cargo.proporcional ? 1000 + i * 37 : 10 + i * 11),
      nm: nome.toUpperCase(),
      nmu: nome,
      cc: `Partido Fictício ${partido.slice(2)}`,
      sgp: partido,
      e: 'n',
      st: '',
      vap: String(v),
      pvap: fmt(validos ? (v / validos) * 100 : 0),
    }
  })
  cand.sort((a, b) => Number(b.vap) - Number(a.vap))
  if (pst >= 100) {
    const lider = Number(cand[0].pvap.replace(',', '.'))
    if (cargo.proporcional) cand.slice(0, 8).forEach((c) => Object.assign(c, { e: 's', st: 'Eleito' }))
    else if (cargo.id === 'senador') cand.slice(0, 2).forEach((c) => Object.assign(c, { e: 's', st: 'Eleito' }))
    else if (lider > 50) Object.assign(cand[0], { e: 's', st: 'Eleito' })
    else cand.slice(0, 2).forEach((c) => (c.st = '2º turno'))
  }

  const secoes = Math.round(eleitores / 350)
  const d = new Date(agora)
  return {
    dg: d.toLocaleDateString('pt-BR'),
    hg: d.toLocaleTimeString('pt-BR'),
    tf: pst >= 100 ? 's' : 'n',
    // Vagas: deputados com 8 vagas fictícias, senado com 2 (renovação de 2/3 em 2026)
    nv: String(cargo.proporcional ? 8 : cargo.id === 'senador' ? 2 : 1),
    s: { ts: String(secoes), st: String(Math.round((secoes * pst) / 100)), pst: fmt(pst) },
    e: {
      te: String(eleitores),
      c: String(comparecimento),
      pc: fmt((comparecimento / aptosApurados) * 100),
      a: String(aptosApurados - comparecimento),
      pa: fmt(((aptosApurados - comparecimento) / aptosApurados) * 100),
    },
    v: {
      vv: String(validos),
      vb: String(brancos),
      pvb: fmt(comparecimento ? (brancos / comparecimento) * 100 : 0),
      tvn: String(nulos),
      ptvn: fmt(comparecimento ? (nulos / comparecimento) * 100 : 0),
    },
    cand,
  }
}

/** Alguns municípios fictícios por estado, só para a busca funcionar na demonstração. */
export function municipiosDemo(): Municipio[] {
  return UFS.flatMap((u, i) =>
    [1, 2, 3, 4].map((k, j) => ({
      codigo: String(10000 + i * 10 + j),
      nome: `Município Exemplo ${k} (${u.sigla.toUpperCase()})`,
      uf: u.sigla,
      capital: j === 0,
    })),
  )
}

/** Andamento fictício por estado: cada um num ritmo, todos chegando a 100%. */
export function andamentoDemo(agora = Date.now()): unknown {
  const geral = progressoDemo(agora)
  const abr = [...UFS.map((u) => u.sigla), 'zz', 'br'].map((uf) => {
    const ritmo = 0.6 + prng(`ritmo|${uf}`)() * 0.9
    const pst = uf === 'br' || geral >= 100 ? geral : Math.min(100, geral * ritmo)
    return { cdabr: uf, tpabr: uf === 'br' ? 'br' : 'uf', s: { ts: '1000', st: String(Math.round(pst * 10)), pst: fmt(pst) } }
  })
  return { dg: new Date(agora).toLocaleDateString('pt-BR'), hg: new Date(agora).toLocaleTimeString('pt-BR'), abr }
}
