const inteiro = new Intl.NumberFormat('pt-BR')
const pct2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmtVotos = (n: number) => inteiro.format(n)
export const fmtPct = (n: number) => `${pct2.format(n)}%`
