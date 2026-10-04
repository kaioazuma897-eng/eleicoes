import { describe, expect, it } from 'vitest'
import { resultadoDemo } from './demo'
import {
  cargoExiste,
  cargoPorId,
  lerConfig,
  lerMunicipios,
  lerResultado,
  montarTurnos,
  num,
  titulo,
  urlMunicipios,
  urlResultado,
} from './tse'

const fonte = { base: 'https://resultados.tse.jus.br/oficial', ciclo: 'ele2026' }

describe('num', () => {
  it('lê números no formato do TSE', () => {
    expect(num('50,90')).toBe(50.9)
    expect(num('1.234.567,8')).toBe(1234567.8)
    expect(num('124252796')).toBe(124252796)
    expect(num('')).toBe(0)
    expect(num(undefined)).toBe(0)
    expect(num(12)).toBe(12)
  })
})

describe('endereços', () => {
  it('monta o arquivo de resultado como o app oficial', () => {
    expect(urlResultado(fonte, '544', cargoPorId('presidente'), 'br')).toBe(
      'https://resultados.tse.jus.br/oficial/ele2026/544/dados-simplificados/br/br-c0001-e000544-r.json',
    )
    expect(urlResultado(fonte, '546', cargoPorId('governador'), 'sp', '71072')).toBe(
      'https://resultados.tse.jus.br/oficial/ele2026/546/dados-simplificados/sp/sp71072-c0003-e000546-r.json',
    )
    expect(urlMunicipios(fonte, '544')).toBe(
      'https://resultados.tse.jus.br/oficial/ele2026/544/config/mun-e000544-cm.json',
    )
  })
})

describe('cargos por lugar', () => {
  it('respeita as particularidades do DF e do resultado nacional', () => {
    expect(cargoExiste(cargoPorId('depDistrital'), 'df')).toBe(true)
    expect(cargoExiste(cargoPorId('depDistrital'), 'sp')).toBe(false)
    expect(cargoExiste(cargoPorId('depEstadual'), 'df')).toBe(false)
    expect(cargoExiste(cargoPorId('governador'), 'br')).toBe(false)
    expect(cargoExiste(cargoPorId('presidente'), 'br')).toBe(true)
  })
})

describe('lerResultado', () => {
  it('lê o arquivo simplificado de um cargo majoritário', () => {
    const r = lerResultado({
      dg: '30/10/2022',
      hg: '20:48:27',
      tf: 's',
      s: { ts: '472075', st: '472075', pst: '100,00' },
      e: { te: '156454011', c: '124252796', pc: '79,42', a: '32200558', pa: '20,58' },
      v: { vv: '118552353', vb: '1964779', pvb: '1,59', tvn: '3930765', ptvn: '3,16' },
      cand: [
        { n: '22', nm: 'CANDIDATO B', sqcand: '2', cc: 'Coligação B', e: 'n', st: 'Não eleito', vap: '58206354', pvap: '49,10' },
        { n: '13', nm: 'CANDIDATO A', sqcand: '1', cc: 'Coligação A', e: 's', st: 'Eleito', vap: '60345999', pvap: '50,90' },
      ],
    })
    expect(r.apurado).toBe(100)
    expect(r.finalizado).toBe(true)
    expect(r.atualizado).toBe('30/10/2022 20:48:27')
    expect(r.pctComparecimento).toBeCloseTo(79.42)
    expect(r.nulos).toBe(3930765)
    expect(r.candidatos.map((c) => c.numero)).toEqual(['13', '22'])
    expect(r.candidatos[0]).toMatchObject({ eleito: true, pct: 50.9, votos: 60345999, coligacao: 'Coligação A' })
  })

  it('encontra candidatos aninhados em partidos (cargos proporcionais)', () => {
    const r = lerResultado({
      s: { pst: '12,5' },
      v: { vv: '1000' },
      carg: [
        {
          agr: [
            { par: [{ sg: 'PXA', cand: [{ n: '1111', nm: 'FULANO', vap: '600', e: 's' }] }] },
            { par: [{ sg: 'PXB', cand: [{ n: '2222', nm: 'BELTRANO', vap: '400', st: 'Suplente' }] }] },
          ],
        },
      ],
    })
    expect(r.candidatos.map((c) => [c.partido, c.votos, c.eleito])).toEqual([
      ['PXA', 600, true],
      ['PXB', 400, false],
    ])
    // Sem % no arquivo: calcula pelos votos válidos
    expect(r.candidatos[0].pct).toBeCloseTo(60)
  })

  it('rejeita arquivos que não são de resultado', () => {
    expect(() => lerResultado('html de erro')).toThrow()
  })

  it('lê os dados da demonstração', () => {
    const r = lerResultado(resultadoDemo(cargoPorId('presidente'), 'br', undefined))
    expect(r.candidatos).toHaveLength(8)
    expect(r.apurado).toBeGreaterThan(0)
    const soma = r.candidatos.reduce((t, c) => t + c.pct, 0)
    expect(soma).toBeGreaterThan(99)
    expect(soma).toBeLessThan(101)
  })
})

describe('municípios', () => {
  it('lê a lista por estado e formata os nomes', () => {
    const m = lerMunicipios({
      abr: [{ cd: 'SP', mu: [{ cd: '71072', nm: 'SÃO PAULO', c: 'S' }, { cd: '62910', nm: 'SÃO JOSÉ DO RIO PRETO', c: 'N' }] }],
    })
    expect(m).toEqual([
      { codigo: '62910', nome: 'São José do Rio Preto', uf: 'sp', capital: false },
      { codigo: '71072', nome: 'São Paulo', uf: 'sp', capital: true },
    ])
    expect(titulo('RIO DE JANEIRO')).toBe('Rio de Janeiro')
  })
})

describe('eleições disponíveis', () => {
  it('separa eleição federal e estadual em cada turno', () => {
    const { ciclo, eleicoes } = lerConfig({
      c: 'ele2026',
      pl: [
        {
          cd: '1',
          dt: '04/10/2026',
          e: [
            { cd: '700', t: '1', nm: 'Eleição Geral Federal 2026' },
            { cd: '702', t: '1', nm: 'Eleições Gerais Estaduais 2026' },
          ],
        },
        {
          cd: '2',
          dt: '25/10/2026',
          e: [
            { cd: '703', t: '2', nm: 'Eleições Gerais Estaduais 2026 - 2º turno' },
            { cd: '701', t: '2', nm: 'Eleição Geral Federal 2026 - 2º turno' },
          ],
        },
      ],
    })
    expect(ciclo).toBe('ele2026')
    expect(montarTurnos(eleicoes)).toEqual([
      { turno: 1, data: '04/10/2026', federal: '700', estadual: '702' },
      { turno: 2, data: '25/10/2026', federal: '701', estadual: '703' },
    ])
  })
})
