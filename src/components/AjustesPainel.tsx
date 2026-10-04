import { useState } from 'react'
import { AJUSTES_PADRAO, type Ajustes } from '../lib/useApuracao'

interface Props {
  ajustes: Ajustes
  onSalvar: (a: Ajustes) => void
}

export function AjustesPainel({ ajustes, onSalvar }: Props) {
  const [rascunho, setRascunho] = useState(ajustes)
  const mudar = (campo: keyof Ajustes) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setRascunho({ ...rascunho, [campo]: e.target.value.trim() })

  return (
    <details className="ajustes card">
      <summary>Ajustes da fonte de dados</summary>
      <p className="pequeno">
        O app lê os arquivos públicos do TSE, os mesmos do app oficial “Resultados”. Se a detecção automática da
        eleição falhar, informe os códigos (ex.: em 2022 eram 544 para presidente e 546 para os demais cargos).
      </p>
      <label className="campo">
        <span>Endereço</span>
        <input value={rascunho.base} onChange={mudar('base')} />
      </label>
      <label className="campo">
        <span>Ciclo</span>
        <input value={rascunho.ciclo} onChange={mudar('ciclo')} />
      </label>
      <div className="linha">
        <label className="campo">
          <span>Código presidente</span>
          <input inputMode="numeric" placeholder="automático" value={rascunho.federal} onChange={mudar('federal')} />
        </label>
        <label className="campo">
          <span>Código demais cargos</span>
          <input inputMode="numeric" placeholder="automático" value={rascunho.estadual} onChange={mudar('estadual')} />
        </label>
      </div>
      <div className="linha">
        <button className="botao" onClick={() => onSalvar({ ...rascunho, base: rascunho.base.replace(/\/+$/, '') })}>
          Salvar
        </button>
        <button
          className="botao-link"
          onClick={() => {
            setRascunho({ ...AJUSTES_PADRAO, modo: ajustes.modo })
            onSalvar({ ...AJUSTES_PADRAO, modo: ajustes.modo })
          }}
        >
          Restaurar padrão
        </button>
      </div>
    </details>
  )
}
