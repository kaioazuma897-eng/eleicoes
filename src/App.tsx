import { useEffect, useState } from 'react'
import { AjustesPainel } from './components/AjustesPainel'
import { Candidatos } from './components/Candidatos'
import { Local } from './components/Local'
import { Mapa } from './components/Mapa'
import { Placar } from './components/Placar'
import { CARGOS, cargoExiste, cargoPorId, UFS, urlFoto, type CargoId, type Turno } from './core/tse'
import { gravar, ler } from './lib/storage'
import { AJUSTES_PADRAO, useAndamento, useMunicipios, useResultado, useTurnos, type Ajustes } from './lib/useApuracao'

interface Escolha {
  turno: number
  cargo: CargoId
  uf: string
  municipio?: string
  /** Último estado escolhido, para onde voltar ao sair de "Brasil". */
  ultimaUf: string
}

const ESCOLHA_PADRAO: Escolha = { turno: 0, cargo: 'presidente', uf: 'br', ultimaUf: 'sp' }

/** Cargos com 2º turno: presidente e governador. */
const temSegundoTurno = (id: CargoId) => id === 'presidente' || id === 'governador'

export default function App() {
  const [ajustes, setAjustes] = useState<Ajustes>(() => ler('ajustes', AJUSTES_PADRAO))
  const [escolha, setEscolha] = useState<Escolha>(() => ler('escolha', ESCOLHA_PADRAO))
  useEffect(() => gravar('ajustes', ajustes), [ajustes])
  useEffect(() => gravar('escolha', escolha), [escolha])

  const { turnos, erro: erroTurnos } = useTurnos(ajustes)
  const turno = escolherTurno(turnos, escolha.turno)
  const cargo = cargoPorId(escolha.cargo)
  const eleicao = turno ? (cargo.esfera === 'federal' ? turno.federal : turno.estadual) : undefined

  const municipios = useMunicipios(ajustes, turno?.federal)
  const andamento = useAndamento(ajustes, eleicao)
  const apuracao = useResultado(ajustes, eleicao, {
    turno: turno?.turno ?? 1,
    cargo,
    uf: escolha.uf,
    municipio: escolha.municipio,
  })

  const cargosVisiveis = CARGOS.filter(
    (c) =>
      (c.nacional || escolha.uf === 'br' || cargoExiste(c, escolha.uf)) &&
      !(c.id === 'depDistrital' && escolha.uf !== 'df' && escolha.uf !== 'br') &&
      !(c.id === 'depEstadual' && escolha.uf === 'df') &&
      ((turno?.turno ?? 1) === 1 || temSegundoTurno(c.id)),
  )

  const mudarCargo = (id: CargoId) => {
    const c = cargoPorId(id)
    setEscolha((e) => {
      // Cargos estaduais não têm resultado do Brasil inteiro: vai para o último estado usado
      let uf = !c.nacional && e.uf === 'br' ? e.ultimaUf : e.uf
      if (id === 'depDistrital') uf = 'df'
      const municipio = uf === e.uf ? e.municipio : undefined
      return { ...e, cargo: id, uf, municipio }
    })
  }

  const mudarLocal = (uf: string, municipio?: string) =>
    setEscolha((e) => {
      let c = e.cargo
      if (uf === 'br' && !cargoPorId(c).nacional) c = 'presidente'
      if (c === 'depDistrital' && uf !== 'df') c = 'depEstadual'
      if (c === 'depEstadual' && uf === 'df') c = 'depDistrital'
      return { ...e, uf, municipio, cargo: c, ultimaUf: uf === 'br' ? e.ultimaUf : uf }
    })

  const nomeLugar =
    escolha.uf === 'br'
      ? 'Brasil'
      : (municipios.find((m) => m.codigo === escolha.municipio && m.uf === escolha.uf)?.nome ??
        UFS.find((u) => u.sigla === escolha.uf)?.nome)

  const demo = ajustes.modo === 'demo'

  return (
    <div className="app">
      <header className="topo">
        <div>
          <h1>Eleições 2026</h1>
          <p className="sub">Apuração com os dados oficiais do TSE</p>
        </div>
        <button
          className={`botao-modo${demo ? ' ativo' : ''}`}
          onClick={() => setAjustes((a) => ({ ...a, modo: a.modo === 'demo' ? 'tse' : 'demo' }))}
          title="Alternar entre dados do TSE e demonstração com dados fictícios"
        >
          {demo ? 'Demonstração' : 'TSE ao vivo'}
        </button>
      </header>

      {demo && (
        <div className="aviso aviso-demo" role="note">
          <strong>Modo demonstração:</strong> candidatos e votos são <strong>fictícios</strong>, só para mostrar como o
          app funciona. Toque em “Demonstração” para voltar aos dados do TSE.
        </div>
      )}

      {turnos && turnos.length > 1 && (
        <div className="segmentos" role="tablist" aria-label="Turno">
          {turnos.map((t) => (
            <button
              key={t.turno}
              role="tab"
              aria-selected={t.turno === turno?.turno}
              onClick={() => setEscolha((e) => ({ ...e, turno: t.turno }))}
            >
              {t.turno}º turno <span className="pequeno">{t.data}</span>
            </button>
          ))}
        </div>
      )}

      <nav className="cargos" aria-label="Cargo">
        {cargosVisiveis.map((c) => (
          <button key={c.id} aria-pressed={c.id === cargo.id} onClick={() => mudarCargo(c.id)}>
            {c.nome}
          </button>
        ))}
      </nav>

      <Local
        uf={escolha.uf}
        municipio={escolha.municipio}
        municipios={municipios}
        permiteBrasil={cargo.nacional}
        onChange={mudarLocal}
      />

      <h2 className="titulo-resultado">
        {cargo.nome} · {nomeLugar}
      </h2>

      {erroTurnos && !turnos && (
        <div className="aviso aviso-erro" role="alert">
          <p>{erroTurnos}</p>
          <p className="pequeno">
            Você pode ver a <button className="botao-link" onClick={() => setAjustes((a) => ({ ...a, modo: 'demo' }))}>
              demonstração
            </button>{' '}
            ou informar os códigos da eleição nos ajustes abaixo.
          </p>
        </div>
      )}

      {!turnos && !erroTurnos && <p className="carregando">Buscando eleições no TSE…</p>}

      {apuracao.erro && (
        <div className="aviso aviso-erro" role="alert">
          <p>{apuracao.erro}</p>
          {apuracao.proxima !== null && <p className="pequeno">Nova tentativa em {apuracao.proxima}s.</p>}
        </div>
      )}

      {turno && !apuracao.resultado && !apuracao.erro && <p className="carregando">Carregando resultado…</p>}

      {apuracao.resultado && eleicao && (
        <>
          <Placar
            resultado={apuracao.resultado}
            proxima={apuracao.proxima}
            carregando={apuracao.carregando}
            onAtualizar={apuracao.atualizar}
          />
          {!escolha.municipio &&
            (andamento.dados ? (
              <Mapa
                ufs={andamento.dados.ufs}
                atualizado={andamento.dados.atualizado}
                selecionada={escolha.uf}
                onEscolher={(uf) =>
                  // Tocar de novo no estado escolhido volta para o Brasil (quando o cargo tem resultado nacional)
                  mudarLocal(uf === escolha.uf && cargo.nacional ? 'br' : uf)
                }
              />
            ) : (
              <p className="vazio card pequeno">
                {andamento.erro ? `Mapa por estado indisponível: ${andamento.erro}` : 'Carregando mapa por estado…'}
              </p>
            ))}
          <Candidatos
            resultado={apuracao.resultado}
            cargo={cargo}
            turno={turno?.turno ?? 1}
            // Presidente se decide no Brasil; os demais cargos, no estado inteiro (nunca num município)
            decideAqui={cargo.nacional ? escolha.uf === 'br' : escolha.uf !== 'br' && !escolha.municipio}
            foto={(c) =>
              demo || !c.sq ? null : urlFoto(ajustes, eleicao, cargo.nacional ? 'br' : escolha.uf, c.sq)
            }
          />
        </>
      )}

      <AjustesPainel key={JSON.stringify(ajustes)} ajustes={ajustes} onSalvar={setAjustes} />

      <footer className="rodape pequeno">
        Dados: Tribunal Superior Eleitoral (resultados.tse.jus.br). App independente, sem vínculo com o TSE. O resultado
        oficial é o divulgado pela Justiça Eleitoral. Versão {__VERSAO__}.
      </footer>
    </div>
  )
}

/** Turno escolhido; sem escolha, o mais recente cuja data já chegou. */
function escolherTurno(turnos: Turno[] | null, escolhido: number): Turno | undefined {
  if (!turnos?.length) return undefined
  const exato = turnos.find((t) => t.turno === escolhido)
  if (exato) return exato
  const hoje = new Date()
  const passados = turnos.filter((t) => {
    const [d, m, a] = t.data.split('/').map(Number)
    return !a || new Date(a, m - 1, d) <= hoje
  })
  return passados.at(-1) ?? turnos[0]
}
