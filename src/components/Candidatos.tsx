import { useMemo, useState } from 'react'
import type { Candidato, Cargo } from '../core/tse'
import { fmtPct, fmtVotos } from '../lib/formato'

interface Props {
  candidatos: Candidato[]
  cargo: Cargo
  /** Endereço da foto do candidato, ou null quando não há foto (demonstração). */
  foto: (c: Candidato) => string | null
}

const POR_PAGINA = 30

export function Candidatos({ candidatos, cargo, foto }: Props) {
  const [busca, setBusca] = useState('')
  const [limite, setLimite] = useState(POR_PAGINA)

  const filtrados = useMemo(() => {
    const q = normalizar(busca.trim())
    if (!q) return candidatos
    return candidatos.filter((c) => normalizar(`${c.nome} ${c.numero} ${c.partido}`).includes(q))
  }, [candidatos, busca])

  if (!candidatos.length) {
    return <p className="vazio card">O TSE ainda não publicou candidatos para este cargo aqui.</p>
  }

  const maior = candidatos[0]?.pct || 1
  const visiveis = cargo.proporcional ? filtrados.slice(0, limite) : filtrados

  return (
    <section aria-label="Candidatos">
      {cargo.proporcional && (
        <input
          className="busca"
          type="search"
          placeholder="Buscar candidato, número ou partido"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value)
            setLimite(POR_PAGINA)
          }}
        />
      )}
      <ol className="candidatos">
        {visiveis.map((c) => (
          <li key={c.sq || `${c.numero}-${c.nome}`} className={`candidato card${c.eleito ? ' eleito' : ''}`}>
            <Foto src={foto(c)} nome={c.nome} />
            <div className="cand-info">
              <div className="cand-linha">
                <span className="cand-nome">{c.nome}</span>
                <span className="cand-pct">{fmtPct(c.pct)}</span>
              </div>
              <div className="cand-linha pequeno">
                <span>
                  {c.numero}
                  {c.partido && ` · ${c.partido}`}
                  {c.situacao && <span className={`selo${c.eleito ? ' selo-ok' : ''}`}>{c.situacao}</span>}
                </span>
                <span>{fmtVotos(c.votos)} votos</span>
              </div>
              <div className="barra-cand" aria-hidden>
                <div style={{ width: `${(c.pct / maior) * 100}%` }} />
              </div>
              {(c.coligacao || c.vice) && (
                <div className="pequeno cand-extra">
                  {c.coligacao}
                  {c.vice && ` · ${cargo.id === 'senador' ? 'Suplentes' : 'Vice'}: ${c.vice}`}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
      {cargo.proporcional && filtrados.length > limite && (
        <button className="botao mais" onClick={() => setLimite((l) => l + POR_PAGINA * 2)}>
          Mostrar mais ({filtrados.length - limite} restantes)
        </button>
      )}
      {cargo.proporcional && busca && !filtrados.length && <p className="vazio">Nenhum candidato encontrado.</p>}
    </section>
  )
}

function Foto({ src, nome }: { src: string | null; nome: string }) {
  const [falhou, setFalhou] = useState(false)
  const iniciais = nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
  if (!src || falhou) return <div className="foto foto-vazia">{iniciais}</div>
  return <img className="foto" src={src} alt="" loading="lazy" onError={() => setFalhou(true)} />
}

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
