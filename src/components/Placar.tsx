import type { Resultado } from '../core/tse'
import { fmtPct, fmtVotos } from '../lib/formato'

interface Props {
  resultado: Resultado
  proxima: number | null
  carregando: boolean
  onAtualizar: () => void
}

export function Placar({ resultado: r, proxima, carregando, onAtualizar }: Props) {
  return (
    <section className="placar card" aria-label="Andamento da apuração">
      <div className="placar-topo">
        <div>
          <div className="rotulo">Urnas apuradas</div>
          <div className="apurado">{fmtPct(r.apurado)}</div>
        </div>
        <div className="atualizacao">
          {r.finalizado ? (
            <span className="selo selo-ok">Totalização concluída</span>
          ) : (
            <span className="ao-vivo">
              <span className="ponto" aria-hidden /> Ao vivo
            </span>
          )}
          {r.atualizado && <div className="pequeno">TSE: {r.atualizado}</div>}
          <button className="botao-link" onClick={onAtualizar} disabled={carregando}>
            {carregando ? 'Atualizando…' : proxima !== null ? `Atualizar (${proxima}s)` : 'Atualizar'}
          </button>
        </div>
      </div>
      <div
        className="barra-apuracao"
        role="progressbar"
        aria-valuenow={r.apurado}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Urnas apuradas"
      >
        <div style={{ width: `${Math.min(100, r.apurado)}%` }} />
      </div>
      {r.secoes > 0 && (
        <div className="pequeno">
          {fmtVotos(r.secoesTotalizadas)} de {fmtVotos(r.secoes)} seções
        </div>
      )}
      <dl className="numeros">
        <Numero rotulo="Comparecimento" valor={r.comparecimento} pct={r.pctComparecimento} />
        <Numero rotulo="Abstenção" valor={r.abstencao} pct={r.pctAbstencao} />
        <Numero rotulo="Brancos" valor={r.brancos} pct={r.pctBrancos} />
        <Numero rotulo="Nulos" valor={r.nulos} pct={r.pctNulos} />
      </dl>
    </section>
  )
}

function Numero({ rotulo, valor, pct }: { rotulo: string; valor: number; pct: number }) {
  return (
    <div>
      <dt>{rotulo}</dt>
      <dd>
        <strong>{pct ? fmtPct(pct) : '—'}</strong>
        <span>{fmtVotos(valor)}</span>
      </dd>
    </div>
  )
}
