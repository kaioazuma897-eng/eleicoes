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
    expect(urlResultado(fonte, '6257', cargoPorId('presidente'), 'br')).toBe(
      'https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json',
    )
    expect(urlResultado(fonte, '6259', cargoPorId('governador'), 'sp', '71072')).toBe(
      'https://resultados.tse.jus.br/oficial/ele2026/6259/dados/sp/sp71072-c0003-e006259-u.json',
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
          // Suplementar realizada em 2026, mas do ciclo de 2024: não deve entrar
          cd: '3237',
          c: 'ele2024',
          dt: '21/06/2026',
          e: [{ cd: '6278', t: '1', nm: 'Eleição Suplementar - Roraima' }],
        },
        {
          cd: '1',
          c: 'ele2026',
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
    expect(eleicoes.find((e) => e.codigo === '6278')?.ciclo).toBe('ele2024')
    expect(montarTurnos(eleicoes.filter((e) => e.ciclo === 'ele2026'))).toEqual([
      { turno: 1, data: '04/10/2026', federal: '700', estadual: '702' },
      { turno: 2, data: '25/10/2026', federal: '701', estadual: '703' },
    ])
  })
})

describe('arquivos reais do TSE (apuração de 04/10/2026, parcial)', () => {
  it('lê o resultado unificado de presidente no Brasil', async () => {
    const r = lerResultado((await import('./fixtures/br-c0001-e006257-u.json')).default)
    expect(r.apurado).toBeCloseTo(36.6)
    expect(r.secoes).toBe(499248)
    expect(r.finalizado).toBe(false)
    expect(r.atualizado).toBe('04/10/2026 18:37:14')
    expect(r.pctComparecimento).toBeCloseTo(79.14)
    expect(r.validos).toBe(42231773)
    expect(r.candidatos).toHaveLength(12)
    expect(r.candidatos[0]).toMatchObject({
      numero: '22',
      partido: 'PL',
      votos: 21383323,
      pct: 50.63,
      sq: '280002551544',
      eleito: false,
    })
    expect(r.candidatos[0].vice).toBeTruthy()
    // Votos em ordem decrescente
    expect(r.candidatos.every((c, i, a) => i === 0 || a[i - 1].votos >= c.votos)).toBe(true)
  })

  it('traz o nome da coligação do governador', async () => {
    const r = lerResultado((await import('./fixtures/sp-c0003-e006259-u.json')).default)
    expect(r.candidatos[0].coligacao).toBe('CORAGEM PARA SEGUIR AVANÇANDO')
    expect(r.candidatos[0].numero).toBe('10')
  })
})

describe('arquivo real do TSE (ele-c.json de 02/10/2026)', () => {
  it('encontra as eleições federal e estadual de 2026 no meio das suplementares', async () => {
    const raw = (await import('./fixtures/ele-c-2026-10-02.json')).default
    const { eleicoes } = lerConfig(raw)
    const de2026 = eleicoes.filter((e) => e.ciclo === 'ele2026')
    expect(montarTurnos(de2026)).toEqual([{ turno: 1, data: '04/10/2026', federal: '6257', estadual: '6259' }])
  })
})

describe('andamento por estado (arquivo real br-e006257-ab.json)', () => {
  it('lê a % apurada de cada estado', async () => {
    const { lerAndamento, urlAndamento } = await import('./tse')
    const a = lerAndamento((await import('./fixtures/br-e006257-ab.json')).default)
    expect(a.ufs).toHaveLength(29)
    expect(a.ufs.find((u) => u.uf === 'sp')?.apurado).toBeCloseTo(45.86)
    expect(a.ufs.find((u) => u.uf === 'zz')).toBeTruthy()
    expect(urlAndamento(fonte, '6257')).toBe(
      'https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-e006257-ab.json',
    )
  })
})

describe('regiões', () => {
  it('cobrem os 27 estados, cada um uma vez', async () => {
    const { REGIOES, UFS } = await import('./tse')
    const todas = REGIOES.flatMap((r) => r.ufs).sort()
    expect(todas).toEqual(UFS.map((u) => u.sigla).sort())
  })

  it('somam as seções em vez de tirar a média das %', async () => {
    const { andamentoPorRegiao } = await import('./tse')
    const sul = andamentoPorRegiao([
      { uf: 'pr', apurado: 100, secoes: 100, secoesTotalizadas: 100 },
      { uf: 'rs', apurado: 0, secoes: 300, secoesTotalizadas: 0 },
      { uf: 'sc', apurado: 0, secoes: 0, secoesTotalizadas: 0 },
    ]).find((r) => r.uf === 'sul')
    expect(sul?.apurado).toBe(25)
    expect(sul?.secoes).toBe(400)
  })
})
