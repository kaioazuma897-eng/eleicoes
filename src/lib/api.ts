/** Busca um JSON do TSE sem usar cópia em cache (os arquivos mudam a cada totalização). */
export async function buscarJson(url: string, timeoutMs = 15000): Promise<unknown> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal })
    if (res.status === 404 || res.status === 403) {
      throw new ErroTse('O TSE ainda não publicou este resultado.', 'indisponivel')
    }
    if (!res.ok) throw new ErroTse(`O TSE respondeu com erro ${res.status}.`, 'servidor')
    try {
      return await res.json()
    } catch {
      throw new ErroTse('O TSE respondeu, mas não com os dados esperados.', 'formato')
    }
  } catch (e) {
    if (e instanceof ErroTse) throw e
    if (ctrl.signal.aborted) throw new ErroTse('O TSE demorou demais para responder.', 'rede')
    // fetch só lança TypeError em falha de rede ou bloqueio do navegador (CORS)
    throw new ErroTse('Não foi possível acessar o site do TSE. Verifique a internet.', 'rede')
  } finally {
    clearTimeout(timer)
  }
}

export class ErroTse extends Error {
  readonly tipo: 'indisponivel' | 'servidor' | 'formato' | 'rede'
  constructor(message: string, tipo: ErroTse['tipo']) {
    super(message)
    this.tipo = tipo
  }
}
