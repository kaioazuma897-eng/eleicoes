import { useMemo, useState } from 'react'
import { projetarSituacao, type Candidato, type Cargo, type Resultado, type Situacao } from '../core/tse'
import { fmtPct, fmtVotos } from '../lib/formato'

interface Props {
  resultado: Resultado
  cargo: Cargo
  turno: number
  /** Este lugar é onde a vaga se decide (Brasil para presidente, estado para os demais)? */
  decideAqui: boolean
  /** Endereço da foto do candidato, ou null quando não há foto (demonstração). */
  foto: (c: Candidato) => string | null
}

const POR_PAGINA = 30

const SELO: Record<Exclude<Situacao, null>, string> = {
  eleito: 'Eleito',
  elegendo: 'Se elegendo',
  segundoTurno: '2º turno',
}

export function Candidatos({ resultado, cargo, turno, decideAqui, foto }: Props) {
  const { candidatos } = resultado
  const [busca, setBusca] = useState('')
  const [soEleitos, setSoEleitos] = useState(false)
  const [limite, setLimite] = useState(POR_PAGINA)

  const situacao = useMemo(
    () => projetarSituacao(resultado, cargo, decideAqui, turno),
    [resultado, cargo, decideAqui, turno],
  )
  const entrando = candidatos.filter((c) => situacao.get(c) === 'eleito' || situacao.get(c) === 'elegendo')
  const vaiAoSegundo = candidatos.some((c) => situacao.get(c) === 'segundoTurno')
  const temProjecao = entrando.length > 0 || vaiAoSegundo

  const filtrados = useMemo(() => {
    const q = normalizar(busca.trim())
    return candidatos.filter(
      (c) =>
        (!soEleitos || situacao.get(c)) && (!q || normalizar(`${c.nome} ${c.numero} ${c.partido}`).includes(q)),
    )
  }, [candidatos, busca, soEleitos, situacao])

  if (!candidatos.length) {
    return <p className="vazio card">O TSE ainda não publicou candidatos para este cargo aqui.</p>
  }

  const maior = candidatos[0]?.pct || 1
  const visiveis = cargo.proporcional ? filtrados.slice(0, limite) : filtrados
  const vagas = resultado.vagas
  const projecaoVisivel = decideAqui && temProjecao

  return (
    <section aria-label="Candidatos">
      {vagas > 0 && (
        <div className="vagas card">
          <div className="vagas-topo">
            <div>
              <div className="rotulo">Vagas em disputa</div>
              <div className="vagas-num">
                {vagas} {vagas === 1 ? 'vaga' : 'vagas'}
              </div>
            </div>
            {projecaoVisivel && (
              <div className="vagas-status">
                <span className="pequeno">{resultado.finalizado ? 'Resultado final' : 'Se a apuração terminasse agora'}</span>
                <strong>
                  {vaiAoSegundo && !entrando.length
                    ? 'Vai para o 2º turno'
                    : `${entrando.length} de ${vagas} ${vagas === 1 ? 'vaga preenchida' : 'vagas preenchidas'}`}
                </strong>
              </div>
            )}
          </div>
          {resultado.quociente > 0 && (
            <p className="pequeno">Quociente eleitoral: {fmtVotos(resultado.quociente)} votos por vaga</p>
          )}
          {decideAqui && cargo.proporcional && resultado.grupos.length > 0 && (
            <div className="grupos" aria-label="Vagas por partido ou federação">
              {resultado.grupos.map((g) => (
                <span key={g.id} className="grupo">
                  {g.nome} <strong>{g.vagas}</strong>
                </span>
              ))}
            </div>
          )}
          {!decideAqui && (
            <p className="pequeno">
              {cargo.nacional
                ? 'A vaga de presidente é decidida pelo voto do Brasil inteiro: escolha “Brasil” para ver quem está se elegendo.'
                : 'As vagas são decididas pelo voto do estado inteiro: toque em “Ver estado todo” para ver quem está se elegendo.'}
            </p>
          )}
          {projecaoVisivel && !resultado.finalizado && (
            <p className="pequeno">
              Projeção com {fmtPct(resultado.apurado)} das urnas apuradas: pode mudar até o fim da contagem.
            </p>
          )}
        </div>
      )}

      {(cargo.proporcional || (projecaoVisivel && candidatos.length > 8)) && (
        <div className="filtros">
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
          {projecaoVisivel && (
            <label className="interruptor">
              <input type="checkbox" checked={soEleitos} onChange={(e) => setSoEleitos(e.target.checked)} />
              Só quem está se elegendo
            </label>
          )}
        </div>
      )}

      <ol className={`candidatos${projecaoVisivel ? ' com-projecao' : ''}`}>
        {visiveis.map((c) => {
          const s = situacao.get(c) ?? null
          const selo = c.situacao || (s ? SELO[s] : '')
          return (
            <li key={c.sq || `${c.numero}-${c.nome}`} className={`candidato card${s ? ` ${s}` : ''}`}>
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
                    {selo && <span className={`selo${s ? ` selo-${s}` : ''}`}>{selo}</span>}
                  </span>
                  <span>{fmtVotos(c.votos)} votos</span>
                </div>
                <div className="barra-cand" aria-hidden>
                  <div style={{ width: `${(c.pct / maior) * 100}%` }} />
                </div>
                {(c.coligacao || c.vice) && (
                  <div className="pequeno cand-extra">
                    {[c.coligacao, c.vice && `${cargo.id === 'senador' ? 'Suplentes' : 'Vice'}: ${c.vice}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
      {cargo.proporcional && filtrados.length > limite && (
        <button className="botao mais" onClick={() => setLimite((l) => l + POR_PAGINA * 2)}>
          Mostrar mais ({filtrados.length - limite} restantes)
        </button>
      )}
      {(busca || soEleitos) && !filtrados.length && <p className="vazio">Nenhum candidato encontrado.</p>}
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
