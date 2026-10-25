import type { VotosRegiao as Regiao } from '../core/tse'
import { fmtPct, fmtVotos } from '../lib/formato'

interface Props {
  regioes: Regiao[]
}

/** Quantos candidatos mostrar em cada região; os demais entram em "Outros". */
const MOSTRAR = 4

export function VotosRegiao({ regioes }: Props) {
  return (
    <section className="votos-regiao card" aria-label="Votos por região">
      <h3>Votos por região</h3>
      <p className="pequeno">Soma dos votos de cada estado da região, com as urnas já apuradas.</p>
      {regioes.map((r) => {
        const topo = r.candidatos.slice(0, MOSTRAR)
        const resto = r.candidatos.slice(MOSTRAR)
        const outros = resto.reduce((t, c) => t + c.votos, 0)
        const maior = topo[0]?.pct || 1
        return (
          <div key={r.id} className="regiao-bloco">
            <div className="regiao-cab">
              <strong>{r.nome}</strong>
              <span className="pequeno">
                {fmtPct(r.apurado)} apurado
                {r.ufsComDados > 0 && ` · ${fmtVotos(r.validos)} válidos`}
              </span>
            </div>
            {!topo.length ? (
              <p className="pequeno">Sem votos publicados ainda.</p>
            ) : (
              <ul className="regiao-cands">
                {topo.map((c, i) => (
                  <li key={c.id} className={i === 0 && c.votos > 0 ? 'lider' : ''}>
                    <div className="regiao-linha">
                      <span className="regiao-nome">{c.nome}</span>
                      <span className="regiao-pct">{fmtPct(c.pct)}</span>
                    </div>
                    <div className="regiao-linha pequeno">
                      <span>
                        {c.numero}
                        {c.partido && ` · ${c.partido}`}
                      </span>
                      <span>{fmtVotos(c.votos)} votos</span>
                    </div>
                    <div className="barra-cand" aria-hidden>
                      <div style={{ width: `${(c.pct / maior) * 100}%` }} />
                    </div>
                  </li>
                ))}
                {outros > 0 && (
                  <li className="pequeno regiao-outros">
                    Outros {resto.length}: {fmtPct(r.validos ? (outros / r.validos) * 100 : 0)} ({fmtVotos(outros)})
                  </li>
                )}
              </ul>
            )}
          </div>
        )
      })}
    </section>
  )
}
