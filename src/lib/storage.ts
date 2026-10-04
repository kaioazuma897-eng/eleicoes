/** Guarda preferências só neste aparelho. Em aba anônima o navegador pode recusar: aí usa o padrão. */
export function ler<T>(chave: string, padrao: T): T {
  try {
    const v = localStorage.getItem(`eleicoes:${chave}`)
    return v === null ? padrao : { ...padrao, ...JSON.parse(v) }
  } catch {
    return padrao
  }
}

export function gravar(chave: string, valor: unknown) {
  try {
    localStorage.setItem(`eleicoes:${chave}`, JSON.stringify(valor))
  } catch {
    // sem armazenamento, as preferências só valem até fechar o app
  }
}
