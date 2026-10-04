import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

/** Lista os arquivos de `public/` (copiados para o build fora do bundle). */
function publicFiles(dir = 'public'): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? publicFiles(path) : [relative('public', path).split(sep).join('/')]
  })
}

/**
 * Gera o service worker no build com a lista exata de arquivos do app,
 * para o PWA funcionar offline depois de instalado. Sem dependências extras.
 */
function serviceWorker(): Plugin {
  return {
    name: 'eleicoes:service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = [...Object.keys(bundle), ...publicFiles()].filter((f) => f !== 'sw.js').sort()
      const template = readFileSync('pwa/sw.js', 'utf8')
      // Arquivos com hash no nome + o próprio service worker: qualquer mudança gera cache novo
      const version = createHash('sha256').update(files.join('\n')).update(template).digest('hex').slice(0, 12)
      const precache = ['./', ...files.map((f) => `./${f}`)]
      const source = template
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(precache))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

function versao(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'dev'
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Caminhos relativos: funciona em https://usuario.github.io/<repositório>/
  base: './',
  // Versão no rodapé (commit do build), para saber se o aparelho está com a versão nova
  define: { __VERSAO__: JSON.stringify(versao()) },
  plugins: [react(), serviceWorker()],
})
