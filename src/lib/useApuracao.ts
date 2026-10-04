import { useCallback, useEffect, useRef, useState } from 'react'
import { andamentoDemo, municipiosDemo, resultadoDemo } from '../core/demo'
import {
  lerAndamento,
  lerConfig,
  lerMunicipios,
  lerResultado,
  montarTurnos,
  TSE_BASE,
  urlAndamento,
  urlConfig,
  urlMunicipios,
  urlResultado,
  type AndamentoUf,
  type Cargo,
  type Municipio,
  type Resultado,
  type Turno,
} from '../core/tse'
import { buscarJson, ErroTse } from './api'

export const INTERVALO_S = 60

export interface Ajustes {
  modo: 'tse' | 'demo'
  base: string
  ciclo: string
  /** Códigos digitados à mão, para quando a detecção automática falhar. Vazio = automático. */
  federal: string
  estadual: string
}

export const AJUSTES_PADRAO: Ajustes = { modo: 'tse', base: TSE_BASE, ciclo: 'ele2026', federal: '', estadual: '' }

export interface Selecao {
  turno: number
  cargo: Cargo
  uf: string
  municipio?: string
}

/** Turnos da eleição: lidos da configuração do TSE, ou dos códigos digitados nos ajustes. */
export function useTurnos(ajustes: Ajustes) {
  const [turnos, setTurnos] = useState<Turno[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setErro(null)
    if (ajustes.modo === 'demo') {
      setTurnos([{ turno: 1, data: 'demonstração', federal: 'demo', estadual: 'demo' }])
      return
    }
    if (ajustes.federal && ajustes.estadual) {
      setTurnos([{ turno: 1, data: 'códigos manuais', federal: ajustes.federal, estadual: ajustes.estadual }])
      return
    }
    let vivo = true
    setTurnos(null)
    buscarJson(urlConfig(ajustes))
      .then((raw) => {
        if (!vivo) return
        const { eleicoes } = lerConfig(raw)
        const ano = ajustes.ciclo.replace(/\D/g, '')
        const doAno = eleicoes.filter((e) =>
          e.ciclo ? e.ciclo === ajustes.ciclo : !ano || e.data.endsWith(ano) || e.nome.includes(ano),
        )
        const t = montarTurnos(doAno)
        if (!t.length) throw new ErroTse(`O TSE ainda não listou as eleições de ${ano || 'agora'}.`, 'indisponivel')
        setTurnos(t)
      })
      .catch((e: unknown) => vivo && setErro(e instanceof Error ? e.message : String(e)))
    return () => {
      vivo = false
    }
  }, [ajustes])

  return { turnos, erro }
}

/** Lista de municípios (a mesma para todos os cargos), baixada uma vez por eleição. */
export function useMunicipios(ajustes: Ajustes, eleicao: string | undefined) {
  const [lista, setLista] = useState<Municipio[]>([])
  useEffect(() => {
    if (ajustes.modo === 'demo') return setLista(municipiosDemo())
    if (!eleicao) return
    let vivo = true
    buscarJson(urlMunicipios(ajustes, eleicao), 30000)
      .then((raw) => vivo && setLista(lerMunicipios(raw)))
      .catch(() => vivo && setLista([]))
    return () => {
      vivo = false
    }
  }, [ajustes, eleicao])
  return lista
}

export interface EstadoApuracao {
  resultado: Resultado | null
  erro: string | null
  carregando: boolean
  /** Segundos até a próxima atualização automática (null = parada). */
  proxima: number | null
  atualizar: () => void
}

/**
 * Resultado de um cargo num lugar, atualizado a cada minuto enquanto o app está visível.
 * Para sozinho quando o TSE marca a totalização como finalizada.
 */
export function useResultado(ajustes: Ajustes, eleicao: string | undefined, sel: Selecao): EstadoApuracao {
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [proxima, setProxima] = useState<number | null>(null)
  const pedido = useRef(0)
  const ultima = useRef(0)

  const chave = `${ajustes.modo}|${ajustes.base}|${ajustes.ciclo}|${eleicao}|${sel.cargo.id}|${sel.uf}|${sel.municipio ?? ''}`

  const carregar = useCallback(async () => {
    if (!eleicao) return
    const id = ++pedido.current
    setCarregando(true)
    try {
      const raw =
        ajustes.modo === 'demo'
          ? resultadoDemo(sel.cargo, sel.uf, sel.municipio)
          : await buscarJson(urlResultado(ajustes, eleicao, sel.cargo, sel.uf, sel.municipio))
      if (id !== pedido.current) return
      ultima.current = Date.now()
      const r = lerResultado(raw)
      setResultado(r)
      setErro(null)
      setProxima(r.finalizado ? null : INTERVALO_S)
    } catch (e) {
      if (id !== pedido.current) return
      setErro(e instanceof Error ? e.message : String(e))
      setProxima(INTERVALO_S)
    } finally {
      if (id === pedido.current) setCarregando(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])

  // Troca de cargo ou lugar: limpa a tela e busca de novo
  useEffect(() => {
    setResultado(null)
    setErro(null)
    void carregar()
  }, [carregar])

  // Contagem regressiva; não gasta internet com o app em segundo plano
  useEffect(() => {
    if (proxima === null) return
    const t = setInterval(() => {
      if (document.hidden) return
      setProxima((p) => (p === null ? null : p - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [proxima === null]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (proxima !== null && proxima <= 0) {
      setProxima(null)
      void carregar()
    }
  }, [proxima, carregar])

  // Ao voltar para o app depois de um tempo, atualiza na hora
  useEffect(() => {
    const aoVoltar = () => {
      const passou = Date.now() - ultima.current > INTERVALO_S * 1000
      if (!document.hidden && passou) setProxima((p) => (p === null ? null : 0))
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => document.removeEventListener('visibilitychange', aoVoltar)
  }, [])

  return { resultado, erro, carregando, proxima, atualizar: () => void carregar() }
}

/** % apurada de cada estado (arquivo de acompanhamento do TSE), atualizada a cada minuto. */
export function useAndamento(ajustes: Ajustes, eleicao: string | undefined) {
  const [dados, setDados] = useState<{ atualizado: string; ufs: AndamentoUf[] } | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!eleicao) return
    let vivo = true
    const carregar = async () => {
      if (document.hidden) return
      try {
        const raw = ajustes.modo === 'demo' ? andamentoDemo() : await buscarJson(urlAndamento(ajustes, eleicao))
        if (!vivo) return
        setDados(lerAndamento(raw))
        setErro(null)
      } catch (e) {
        // Sem o mapa o resto do app continua funcionando; tenta de novo no próximo ciclo
        if (vivo) setErro(e instanceof Error ? e.message : String(e))
      }
    }
    void carregar()
    const t = setInterval(carregar, INTERVALO_S * 1000)
    document.addEventListener('visibilitychange', carregar)
    return () => {
      vivo = false
      clearInterval(t)
      document.removeEventListener('visibilitychange', carregar)
    }
  }, [ajustes, eleicao])

  return { dados, erro }
}
