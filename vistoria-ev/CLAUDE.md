# Vistoria EV — CLAUDE.md

PWA offline para vistoriadores da KK Projetos mapearem EV em campo. Sem backend: tudo em IndexedDB, exportação em ZIP.

## Stack
Vite + React 18 + TypeScript, vite-plugin-pwa (workbox generateSW), idb, jszip. CSS puro (`src/styles.css`). Nada além disso sem motivo forte.

## Comandos
`npm run dev` · `npm run build` (tsc + vite) · `npm run preview`

## Estrutura
- `src/config/` — **regras de negócio declarativas**. `ev.ts` define registro, checklist (43 itens), patologias, pranchas, pastas e campos de antena. Novo tipo = novo arquivo + registro em `index.ts`. Telas não conhecem itens específicos.
- `src/db/` — `schema.ts` (stores) e `repo.ts` (todo acesso ao banco).
- `src/lib/` — `slots.ts` (chaves e status), `naming.ts`, `image.ts` (redução), `fotos.ts`, `export.ts` (ZIP/txt/json/csv), `share.ts`, `storage.ts`, `rota.ts` (hash router).
- `src/screens/` — uma tela por aba + `SlotDetalhe`. `src/components/` — `SlotSecao` (estado + fotos de 1 slot), `FotoGrid`, `Campo`, `CapturaBotoes`.

## Modelo (IndexedDB `vistoria-kk`)
- `vistorias` {id, tipo, campos, createdAt, updatedAt, ultimaExportacao}
- `slots` {id=`vid|itemId`, vistoriaId, itemId, estado: NAO_TEM|OUTRO|ENCONTRADA|null, justificativa}: só existe quando há estado/justificativa.
- `fotos` {id, vistoriaId, itemId, nome, ordem, antena?, thumb} + `fotoDados` {id, dados}: arquivo grande separado da miniatura, para listar sem carregar tudo na memória.
- `antenas` {id, vistoriaId, ordem, campos}

## Decisões
- **Chave de slot**: `C01`, `C03:A`, `C33:030`, `P04`, `PR02:FRENTE`. Item com `subslots` vira N slots.
- **Status é derivado** (estado salvo + nº de fotos), não armazenado. Item completo = todos os slots resolvidos; NÃO TEM/OUTRO sem justificativa conta como pendente.
- **Nomes de arquivo são recalculados na exportação** (obra/ID podem mudar, fotos podem ser excluídas). Sequência por slot (+ antena).
- Fotos salvas como ArrayBuffer (evita bugs antigos de Blob em IDB no Safari). Redução: lado maior 2000px, JPEG 0,85; thumb 320px.
- Autosave com debounce (`useAutosave`) + flush em pagehide/visibilitychange/troca de aba. `salvarCampos` grava só `campos` para não sobrescrever `ultimaExportacao`.
- ZIP em duas etapas (gerar → compartilhar/baixar) porque a Web Share API exige gesto recente do usuário.
- Duplicar vistoria copia registro e antenas, não fotos/checklist.
- Câmera via `<input capture="environment">` (sem getUserMedia); botão Galeria como alternativa.
- Exportação com pendências só avisa; `bloquearExportComPendentes` no config muda isso.
- **Validação** (`lib/validacao.ts`): `min`/`max`/`formato` no CampoDef + `limiteAlturaAntena`. Só avisa (laranja) e entra em "Valores a conferir" nas pendências; nunca bloqueia digitação.
- **Metadados da foto**: o canvas apaga o EXIF, então o app grava `capturadaEm` (lastModified do arquivo) e `gps` (geolocalização do aparelho, cache de 2 min, timeout 4 s, falha silenciosa). Vão para registro.json/txt e, se `carimboFotos` ≠ "Não", para uma faixa carimbada na foto.
- **Qualidade da foto** (`medirQualidade`): brilho médio e variância do Laplaciano em 640 px, divididos em 4x4 regiões (vale a 2ª mais nítida, para céu/parede lisa não gerar falso alarme). Limites em `qualidadeFoto` no config são hipótese inicial: calibrar com fotos reais. Alerta nunca bloqueia: "Refazer" (abre a câmera e troca a foto) ou "Manter".
- **Importar backup** (`lib/importar.ts`): lê o `registro.json` do ZIP (formato 1 e 2; o 2 tem `estadoSalvo` por slot). Mantém o id original se não existir no aparelho, senão cria cópia. Fotos entram sem recompressão (só gera a miniatura), na ordem original. Falha no meio desfaz tudo. Exportar → importar → exportar dá fotos idênticas em nome e bytes.
- **Prévia** (`vite build --mode artifact`): sem service worker, rota em memória e `confirm` sempre verdadeiro, para rodar dentro do frame do claude.ai.

## Cuidados
- O `registro.json` é também o formato de backup: mudança nele exige subir `formato` e manter a leitura das versões antigas em `importar.ts`.
- Não mudar a versão do DB sem escrever migração em `schema.ts` (dados de campo não podem ser perdidos).
- Mapeamento item → pasta é hipótese; mudar só em `config/ev.ts`.
