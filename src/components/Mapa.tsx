import brasil from '@svg-maps/brazil'
import { useState } from 'react'
import { UFS, type AndamentoUf } from '../core/tse'
import { fmtPct, fmtVotos } from '../lib/formato'

interface Local {
  id: string
  name: string
  path: string
}
const MAPA = brasil as unknown as { viewBox: string; locations: Local[] }

/** Faixas da escala: uma cor só, do claro (pouco apurado) ao escuro (tudo apurado). */
const FAIXAS = [
  { ate: 20, rotulo: '0–20%' },
  { ate: 40, rotulo: '20–40%' },
  { ate: 60, rotulo: '40–60%' },
  { ate: 80, rotulo: '60–80%' },
  { ate: 99.995, rotulo: '80–99%' },
  { ate: Infinity, rotulo: '100%' },
]
const faixa = (pct: number) => FAIXAS.findIndex((f) => pct < f.ate)

interface Props {
  ufs: AndamentoUf[]
  atualizado: string
  selecionada: string
  onEscolher: (uf: string) => void
}

export function Mapa({ ufs, atualizado, selecionada, onEscolher }: Props) {
  const [foco, setFoco] = useState<string | null>(null)
  const porUf = new Map(ufs.map((u) => [u.uf, u]))
  const exterior = porUf.get('zz')
  const nome = (uf: string) => UFS.find((u) => u.sigla === uf)?.nome ?? uf.toUpperCase()

  const destaque = foco ?? (selecionada !== 'br' ? selecionada : null)
  const info = destaque ? porUf.get(destaque) : undefined

  return (
    <section className="mapa card" aria-label="Urnas apuradas por estado">
      <div className="mapa-topo">
        <h3>Urnas apuradas por estado</h3>
        {atualizado && <span className="pequeno">TSE: {atualizado}</span>}
      </div>

      {/* Linha de leitura: o estado sob o dedo/mouse, ou o escolhido */}
      <div className="mapa-info" aria-live="polite">
        {info && destaque ? (
          <>
            <strong>{nome(destaque)}</strong> · {fmtPct(info.apurado)} apurado
            <span className="pequeno">
              {' '}
              ({fmtVotos(info.secoesTotalizadas)} de {fmtVotos(info.secoes)} seções)
            </span>
          </>
        ) : (
          <span className="pequeno">Toque em um estado para ver o resultado dele</span>
        )}
      </div>

      <svg viewBox={MAPA.viewBox} className="mapa-svg" role="group" aria-label="Mapa do Brasil">
        {MAPA.locations.map((l) => {
          const a = porUf.get(l.id)
          const f = a ? faixa(a.apurado) : -1
          return (
            <path
              key={l.id}
              d={l.path}
              className={`uf f${f}${l.id === selecionada ? ' sel' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={`${l.name}: ${a ? fmtPct(a.apurado) : 'sem dados'} das urnas apuradas`}
              onMouseEnter={() => setFoco(l.id)}
              onMouseLeave={() => setFoco(null)}
              onFocus={() => setFoco(l.id)}
              onBlur={() => setFoco(null)}
              onClick={() => onEscolher(l.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onEscolher(l.id)
                }
              }}
            />
          )
        })}
        {/* O estado escolhido por cima, para o contorno não ficar escondido pelos vizinhos */}
        {MAPA.locations
          .filter((l) => l.id === selecionada)
          .flatMap((l) => [
            // Halo na cor do cartão por baixo: o contorno aparece até sobre os azuis mais escuros
            <path key="halo" d={l.path} className="uf-halo" aria-hidden />,
            <path key="sel" d={l.path} className="uf-contorno" aria-hidden />,
          ])}
      </svg>

      <div className="legenda" aria-label="Legenda">
        {FAIXAS.map((f, i) => (
          <span key={f.rotulo} className="legenda-item">
            <span className={`amostra f${i}`} aria-hidden />
            {f.rotulo}
          </span>
        ))}
      </div>

      {exterior && (
        <p className="pequeno mapa-exterior">Exterior: {fmtPct(exterior.apurado)} apurado</p>
      )}

      <details className="mapa-lista">
        <summary>Ver em lista</summary>
        <table>
          <thead>
            <tr>
              <th>Estado</th>
              <th>Apurado</th>
              <th>Seções</th>
            </tr>
          </thead>
          <tbody>
            {[...ufs]
              .filter((u) => u.uf !== 'br')
              .sort((a, b) => b.apurado - a.apurado)
              .map((u) => (
                <tr key={u.uf}>
                  <td>{u.uf === 'zz' ? 'Exterior' : nome(u.uf)}</td>
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
