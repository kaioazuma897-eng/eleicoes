import { useMemo, useState } from 'react'
import { UFS, type Municipio } from '../core/tse'

interface Props {
  uf: string
  municipio?: string
  municipios: Municipio[]
  /** Presidente tem resultado nacional; os outros cargos começam no estado. */
  permiteBrasil: boolean
  onChange: (uf: string, municipio?: string) => void
}

export function Local({ uf, municipio, municipios, permiteBrasil, onChange }: Props) {
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)

  const doEstado = useMemo(() => municipios.filter((m) => m.uf === uf), [municipios, uf])
  const atual = doEstado.find((m) => m.codigo === municipio)

  const sugestoes = useMemo(() => {
    const q = normalizar(busca.trim())
    const base = q ? doEstado.filter((m) => normalizar(m.nome).includes(q)) : doEstado.filter((m) => m.capital)
    return base.slice(0, 12)
  }, [doEstado, busca])

  return (
    <div className="local">
      <label className="campo">
        <span>Lugar</span>
        <select value={uf} onChange={(e) => onChange(e.target.value)}>
          {permiteBrasil && <option value="br">Brasil</option>}
          {UFS.map((u) => (
            <option key={u.sigla} value={u.sigla}>
              {u.nome}
            </option>
          ))}
        </select>
      </label>

      {uf !== 'br' && (
        <div className="campo municipio">
          <span>Município</span>
          {atual ? (
            <div className="escolhido">
              <span>{atual.nome}</span>
              <button className="botao-link" onClick={() => onChange(uf)}>
                Ver estado todo
              </button>
            </div>
          ) : (
            <div className="autocompletar">
              <input
                type="search"
                placeholder={doEstado.length ? 'Todos — busque uma cidade' : 'Estado inteiro'}
                disabled={!doEstado.length}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onFocus={() => setAberto(true)}
                onBlur={() => setTimeout(() => setAberto(false), 150)}
              />
              {aberto && sugestoes.length > 0 && (
                <ul className="sugestoes" role="listbox">
                  {sugestoes.map((m) => (
                    <li key={m.codigo}>
                      <button
                        role="option"
                        aria-selected={false}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setBusca('')
                          setAberto(false)
                          onChange(uf, m.codigo)
                        }}
                      >
                        {m.nome}
                        {m.capital && <span className="pequeno"> · capital</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
