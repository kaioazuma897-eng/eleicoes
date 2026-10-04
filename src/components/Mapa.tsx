import brasil from '@svg-maps/brazil'
import { useEffect, useState } from 'react'
import { andamentoPorRegiao, REGIOES, regiaoDaUf, UFS, type AndamentoUf } from '../core/tse'
import { fmtPct, fmtVotos } from '../lib/formato'
import { gravar, ler } from '../lib/storage'

interface Local {
  id: string
  name: string
  path: string
}
const MAPA = brasil as unknown as { viewBox: string; locations: Local[] }

/** Faixas da escala: uma cor só; quanto mais apurado, mais forte o azul. */
const FAIXAS = [
  { ate: 20, rotulo: '0–20%' },
  { ate: 40, rotulo: '20–40%' },
  { ate: 60, rotulo: '40–60%' },
  { ate: 80, rotulo: '60–80%' },
  { ate: 99.995, rotulo: '80–99%' },
  { ate: Infinity, rotulo: '100%' },
]
const faixa = (pct: number) => FAIXAS.findIndex((f) => pct < f.ate)

type Visao = 'estados' | 'regioes'

interface Props {
  ufs: AndamentoUf[]
  atualizado: string
  selecionada: string
  onEscolher: (uf: string) => void
}

export function Mapa({ ufs, atualizado, selecionada, onEscolher }: Props) {
  const [visao, setVisao] = useState<Visao>(() => ler('mapa', { visao: 'estados' as Visao }).visao)
  useEffect(() => gravar('mapa', { visao }), [visao])
  const [foco, setFoco] = useState<string | null>(null)

  const porUf = new Map(ufs.map((u) => [u.uf, u]))
  const regioes = andamentoPorRegiao(ufs)
  const porRegiao = new Map(regioes.map((r) => [r.uf, r]))
  const exterior = porUf.get('zz')
  const nomeUf = (uf: string) => UFS.find((u) => u.sigla === uf)?.nome ?? uf.toUpperCase()

  const porRegioes = visao === 'regioes'
  /** O que cada estado pinta: o próprio andamento, ou o da sua região. */
  const valorDe = (uf: string) => (porRegioes ? porRegiao.get(regiaoDaUf(uf)?.id ?? '') : porUf.get(uf))

  // Linha de leitura: o que está sob o dedo/mouse, ou o estado escolhido
  const padrao = selecionada === 'br' ? null : porRegioes ? (regiaoDaUf(selecionada)?.id ?? null) : selecionada
  const destaque = foco ?? padrao
  const info = destaque ? (porRegioes ? porRegiao.get(destaque) : porUf.get(destaque)) : undefined
  const nomeDestaque = destaque ? (porRegioes ? porRegiao.get(destaque)?.nome : nomeUf(destaque)) : ''

  const regiaoFocada = porRegioes ? destaque : null
  const focar = (uf: string | null) => setFoco(uf && porRegioes ? (regiaoDaUf(uf)?.id ?? null) : uf)

  const desenharUf = (l: Local) => {
    const a = valorDe(l.id)
    const f = a ? faixa(a.apurado) : -1
    const regiao = regiaoDaUf(l.id)
    const apagado = regiaoFocada !== null && regiao?.id !== regiaoFocada
    return (
      <path
        key={l.id}
        d={l.path}
        className={`uf f${f}${apagado ? ' apagado' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={
          porRegioes
            ? `${l.name}, região ${regiao?.nome}: ${a ? fmtPct(a.apurado) : 'sem dados'} das urnas apuradas na região`
            : `${l.name}: ${a ? fmtPct(a.apurado) : 'sem dados'} das urnas apuradas`
        }
        onMouseEnter={() => focar(l.id)}
        onMouseLeave={() => setFoco(null)}
        onFocus={() => focar(l.id)}
        onBlur={() => setFoco(null)}
        // Nas regiões o toque só mostra o andamento: o TSE não publica votos por região
        onClick={() => (porRegioes ? focar(l.id) : onEscolher(l.id))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (porRegioes) focar(l.id)
            else onEscolher(l.id)
          }
        }}
      />
    )
        }

  return (
    <section className="mapa card" aria-label={`Urnas apuradas por ${porRegioes ? 'região' : 'estado'}`}>
      <div className="mapa-topo">
        <h3>Urnas apuradas por {porRegioes ? 'região' : 'estado'}</h3>
        <div className="segmentos mini" role="tablist" aria-label="Ver o mapa por">
    {(['estados', 'regioes'] as const).map((v) => (
      <button
        key={v}
        role="tab"
        aria-selected={visao === v}
        onClick={() => {
          setVisao(v)
          setFoco(null)
        }}
      >
        {v === 'estados' ? 'Estados' : 'Regiões'}
      </button>
    ))}
        </div>
      </div>
      {atualizado && <span className="pequeno">TSE: {atualizado}</span>}

      <div className="mapa-info" aria-live="polite">
        {info && destaque ? (
    <>
      <strong>{nomeDestaque}</strong> · {fmtPct(info.apurado)} apurado
      <span className="pequeno">
        {' '}
        ({fmtVotos(info.secoesTotalizadas)} de {fmtVotos(info.secoes)} seções)
      </span>
    </>
        ) : (
    <span className="pequeno">
      {porRegioes ? 'Toque em uma região para ver o andamento dela' : 'Toque em um estado para ver o resultado dele'}
    </span>
        )}
      </div>

      <svg
        viewBox={MAPA.viewBox}
        className={`mapa-svg${porRegioes ? ' regioes' : ''}`}
        role="group"
        aria-label="Mapa do Brasil"
      >
        {porRegioes
    ? // Por região: cada região ganha um contorno grosso na cor do cartão e, por cima, os
      // seus estados sem divisas. O que sobra do contorno é só a divisa entre regiões.
      REGIOES.flatMap((r) => {
        const dela = MAPA.locations.filter((l) => r.ufs.includes(l.id))
        return [
          ...dela.map((l) => <path key={`divisa-${l.id}`} d={l.path} className="divisa-regiao" aria-hidden />),
          ...dela.map(desenharUf),
        ]
      })
    : MAPA.locations.map(desenharUf)}
        {/* O estado escolhido por cima, para o contorno não ficar escondido pelos vizinhos */}
        {!porRegioes &&
    MAPA.locations
      .filter((l) => l.id === selecionada)
      .flatMap((l) => [
        // Halo na cor do cartão por baixo: o contorno aparece até sobre os azuis mais fortes
        <path key="halo" d={l.path} className="uf-halo" aria-hidden />,
        <path key="sel" d={l.path} className="uf-contorno" aria-hidden />,
      ])}
        {porRegioes &&
    REGIOES.map((r) => {
      const a = porRegiao.get(r.id)
      return (
        <text key={r.id} x={r.rotulo[0]} y={r.rotulo[1]} className="rotulo-regiao" aria-hidden>
          <tspan x={r.rotulo[0]}>{r.nome}</tspan>
          {a && (
            <tspan x={r.rotulo[0]} dy="1.2em" className="rotulo-pct">
              {fmtPct(a.apurado)}
            </tspan>
          )}
        </text>
      )
    })}
      </svg>

      <div className="legenda" aria-label="Legenda">
        {FAIXAS.map((f, i) => (
    <span key={f.rotulo} className="legenda-item">
      <span className={`amostra f${i}`} aria-hidden />
      {f.rotulo}
    </span>
        ))}
      </div>

      {exterior && <p className="pequeno mapa-exterior">Exterior: {fmtPct(exterior.apurado)} apurado</p>}

      <details className="mapa-lista">
        <summary>Ver em lista</summary>
        <table>
    <thead>
      <tr>
        <th>{porRegioes ? 'Região' : 'Estado'}</th>
        <th>Apurado</th>
        <th>Seções</th>
      </tr>
    </thead>
    <tbody>
      {(porRegioes
        ? regioes.map((r) => ({ ...r, rotulo: r.nome }))
        : ufs
            .filter((u) => u.uf !== 'br')
            .map((u) => ({ ...u, rotulo: u.uf === 'zz' ? 'Exterior' : nomeUf(u.uf) }))
      )
        .sort((a, b) => b.apurado - a.apurado)
        .map((u) => (
          <tr key={u.uf}>
            <td>{u.rotulo}</td>
            <td>{fmtPct(u.apurado)}</td>
            <td>
              {fmtVotos(u.secoesTotalizadas)} / {fmtVotos(u.secoes)}
            </td>
          </tr>
        ))}
    </tbody>
        </table>
      </details>
      <p className="credito">Mapa: svg-maps/brazil, Victor Cazanave (CC BY 4.0)</p>
    </section>
  )
  }
