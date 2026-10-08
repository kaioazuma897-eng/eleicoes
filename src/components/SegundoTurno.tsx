import { useState } from 'react'
import type { Candidato, Cargo, Resultado } from '../core/tse'
import { fmtPct, fmtVotos } from '../lib/formato'

interface Props {
  cargo: Cargo
  nomeLugar: string
  /** Data do 2º turno, ex.: "25/10/2026". */
  data: string
  /** Resultado do 1º turno no mesmo lugar (para saber quem disputa). */
  primeiro: Resultado | null
  /** Este lugar é onde a vaga se decide (Brasil para presidente, estado para governador)? */
  decideAqui: boolean
  foto: (c: Candidato) => string | null
  onVerPrimeiro: () => void
}

/** Antes de o TSE publicar a apuração do 2º turno: quem disputa e como foi no 1º turno. */
export function AntesDoSegundoTurno({ cargo, nomeLugar, data, primeiro, decideAqui, foto, onVerPrimeiro }: Props) {
  const finalistas = primeiro?.candidatos.filter((c) => /2.?\s*turno/i.test(c.situacao)) ?? []
  const eleito = primeiro?.candidatos.find((c) => c.eleito)
  const jaComecou = passou(data)

  return (
    <section className="segundo-turno card" aria-label="2º turno">
      <div className="rotulo">2º turno · {data}</div>
      {primeiro && !finalistas.length && eleito ? (
        <>
          <h3>Não há 2º turno para {cargo.nome.toLowerCase()} aqui</h3>
          <p>
            <strong>{eleito.nome}</strong> foi eleito no 1º turno em {nomeLugar}, com {fmtPct(eleito.pct)} dos votos
            válidos.
          </p>
        </>
      ) : (
        <>
          <h3>
            {jaComecou
              ? 'A apuração do 2º turno ainda não começou'
              : `O 2º turno será em ${data}`}
          </h3>
          <p className="pequeno">
            {jaComecou
              ? 'Os resultados aparecem aqui assim que o TSE publicar, depois que as urnas fecharem às 17h (horário de Brasília). O app confere sozinho.'
              : 'No dia, a apuração aparece aqui sozinha, assim que o TSE publicar os primeiros resultados.'}
          </p>
          {finalistas.length > 0 && (
            <>
              <div className="rotulo">Quem disputa{decideAqui ? '' : ` · votação no 1º turno em ${nomeLugar}`}</div>
              <ol className="finalistas">
                {finalistas.map((c) => (
                  <li key={c.sq || c.numero}>
                    <FotoPequena src={foto(c)} nome={c.nome} />
                    <div>
                      <strong>{c.nome}</strong>
                      <div className="pequeno">
                        {c.numero} · {c.partido} · 1º turno: {fmtPct(c.pct)} ({fmtVotos(c.votos)} votos)
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
          {primeiro && !finalistas.length && !eleito && (
            <p className="pequeno">O resultado do 1º turno aqui ainda não define quem vai ao 2º turno.</p>
          )}
        </>
      )}
      <button className="botao-link" onClick={onVerPrimeiro}>
        Ver o resultado do 1º turno
      </button>
    </section>
  )
}

function FotoPequena({ src, nome }: { src: string | null; nome: string }) {
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

/** A data ("dd/mm/aaaa") já chegou? */
export function passou(data: string, agora = new Date()): boolean {
  const [d, m, a] = data.split('/').map(Number)
  return !a || new Date(a, m - 1, d) <= agora
}
