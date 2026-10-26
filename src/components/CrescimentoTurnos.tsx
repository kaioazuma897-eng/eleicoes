import { useState } from 'react'
import type { ComparacaoCandidato, Finalista, LinhaComparacao } from '../core/tse'
import { fmtPct, fmtVotos } from '../lib/formato'

interface Props {
  finalistas: Finalista[]
  linhas: LinhaComparacao[]
}

type Ordem = 'nome' | 0 | 1

const pp = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'always' })
const pctInt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0, signDisplay: 'always' })
const votosSinal = new Intl.NumberFormat('pt-BR', { signDisplay: 'always' })

/** Diferença em pontos percentuais, com seta. */
function Variacao({ c }: { c: ComparacaoCandidato }) {
  const d = c.pct2 - c.pct1
  return (
    <span className={`variacao ${d >= 0 ? 'sobe' : 'desce'}`}>
      {d >= 0 ? '▲' : '▼'} {pp.format(d)} pp
    </span>
  )
}

/** Crescimento em votos: "+1.234.567 (+35%)". */
function crescimentoVotos(c: ComparacaoCandidato) {
  const d = c.votos2 - c.votos1
  const rel = c.votos1 ? ` (${pctInt.format((d / c.votos1) * 100)}%)` : ''
  return `${votosSinal.format(d)} votos${rel}`
}

const sobe = (l: LinhaComparacao, i: number) => l.cands[i].pct2 - l.cands[i].pct1

export function CrescimentoTurnos({ finalistas, linhas }: Props) {
  const [ordem, setOrdem] = useState<Ordem>('nome')
  const brasil = linhas.find((l) => l.uf === 'br')
  const estados = linhas.filter((l) => l.uf !== 'br' && l.uf !== 'zz')
  const exterior = linhas.find((l) => l.uf === 'zz')

  const tabela = [...estados, ...(exterior ? [exterior] : [])].sort((a, b) =>
    ordem === 'nome' ? a.nome.localeCompare(b.nome, 'pt-BR') : sobe(b, ordem) - sobe(a, ordem),
  )

  return (
    <section className="crescimento card" aria-label="Do 1º para o 2º turno">
      <h3>Do 1º para o 2º turno</h3>
      <p className="pequeno">% dos votos válidos de cada finalista no 1º e no 2º turno, e quanto mudou.</p>

      {brasil && (
        <div className="cresc-resumo">
          {finalistas.map((f, i) => {
            const c = brasil.cands[i]
            const melhores = [...estados].sort((a, b) => sobe(b, i) - sobe(a, i)).slice(0, 3)
            return (
              <div key={f.numero} className="cresc-cand">
                <strong className="cresc-nome">{f.nome}</strong>
                <span className="pequeno">
                  {f.numero}
                  {f.partido && ` · ${f.partido}`}
                </span>
                <div className="cresc-pcts">
                  {fmtPct(c.pct1)} → <strong>{fmtPct(c.pct2)}</strong>
                </div>
                <Variacao c={c} />
                <span className="pequeno">{crescimentoVotos(c)}</span>
                <span className="pequeno cresc-melhores">
                  Mais cresceu em: {melhores.map((l) => `${l.uf.toUpperCase()} (${pp.format(sobe(l, i))})`).join(', ')}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div className="cresc-ordem">
        <label className="pequeno" htmlFor="cresc-ordem">
          Ordenar
        </label>
        <select
          id="cresc-ordem"
          value={String(ordem)}
          onChange={(e) => setOrdem(e.target.value === 'nome' ? 'nome' : (Number(e.target.value) as 0 | 1))}
        >
          <option value="nome">Estado (A–Z)</option>
          {finalistas.map((f, i) => (
            <option key={f.numero} value={i}>
              Quem mais cresceu: {f.nome}
            </option>
          ))}
        </select>
      </div>

      <table className="cresc-tabela">
        <thead>
          <tr>
            <th>Estado</th>
            {finalistas.map((f) => (
              <th key={f.numero}>{f.nome.split(' ')[0]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tabela.map((l) => {
            const venceu = l.cands[0].votos2 === l.cands[1].votos2 ? -1 : l.cands[0].votos2 > l.cands[1].votos2 ? 0 : 1
            return (
              <tr key={l.uf}>
                <td>{l.uf === 'zz' ? 'Exterior' : l.uf.toUpperCase()}</td>
                {l.cands.map((c, i) => (
                  <td
                    key={i}
                    className={i === venceu ? 'venceu' : ''}
                    title={`1º turno: ${fmtPct(c.pct1)} (${fmtVotos(c.votos1)} votos) · 2º turno: ${fmtPct(c.pct2)} (${fmtVotos(c.votos2)} votos)`}
                  >
                    <div>
                      <span className="pequeno cresc-antes">{fmtPct(c.pct1)} →</span> {fmtPct(c.pct2)}
                    </div>
                    <Variacao c={c} />
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="pequeno">Em negrito, quem venceu no estado no 2º turno. “pp” = pontos percentuais.</p>
    </section>
  )
}
