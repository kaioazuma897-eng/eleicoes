# Eleições 2026

Acompanhe a apuração das Eleições 2026 pelo celular: **presidente, governador, senador e deputados**, no
Brasil inteiro, por estado ou por município. Os dados vêm dos **arquivos públicos do TSE**
(`resultados.tse.jus.br`), os mesmos que alimentam o app oficial “Resultados”.

- % de urnas apuradas, comparecimento, abstenção, brancos e nulos
- candidatos com votos, %, partido/coligação, foto e situação (eleito, 2º turno, suplente…)
- atualização automática a cada minuto (pausa com o app em segundo plano e para quando a totalização termina)
- busca de município e de candidato (deputados)
- 1º e 2º turno
- **modo demonstração** com dados fictícios, para ver o app funcionando fora do dia da eleição
- app instalável (PWA): no iPhone, Safari → Compartilhar → **Adicionar à Tela de Início**

```bash
npm install
npm run dev     # http://localhost:5173
npm test
npm run build
```

A cada `push` na `main`, o GitHub Actions ([`deploy.yml`](.github/workflows/deploy.yml)) roda lint, testes e
build e publica no GitHub Pages. Ative em **Settings → Pages → Source: GitHub Actions**.

## De onde vêm os dados

| Arquivo do TSE | Para quê |
|---|---|
| `oficial/comum/config/ele-c.json` | descobre os códigos das eleições de cada turno |
| `oficial/ele2026/<eleição>/config/mun-e<eleição>-cm.json` | lista de municípios |
| `oficial/ele2026/<eleição>/dados-simplificados/<uf>/<uf><município>-c<cargo>-e<eleição>-r.json` | resultado |
| `oficial/ele2026/<eleição>/fotos/<uf>/<sqcand>.jpeg` | foto do candidato |

Nas eleições gerais o TSE usa um código para a eleição **federal** (presidente) e outro para a **estadual**
(demais cargos) em cada turno — em 2022 eram 544/546 no 1º turno e 545/547 no 2º. O app detecta isso sozinho
pelo `ele-c.json`; se falhar, informe os códigos em **Ajustes da fonte de dados**.

O formato desses arquivos não tem documentação oficial, então a leitura ([`src/core/tse.ts`](src/core/tse.ts))
é tolerante: procura os campos conhecidos onde estiverem. Os testes usam o formato dos arquivos de 2022.

> App independente, sem vínculo com o TSE. O resultado oficial é o divulgado pela Justiça Eleitoral.
