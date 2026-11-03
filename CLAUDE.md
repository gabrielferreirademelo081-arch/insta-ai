# insta-ai — CLAUDE.md

Repositório do Gabriel (estagiário de Engenharia Civil na KK Projetos, telecom). Hoje contém um projeto:

- **`vistoria-ev/`** — PWA offline para vistoriadores mapearem EV (estrutura vertical de telecom) em campo.
  Arquitetura, modelo de dados e decisões: **leia `vistoria-ev/CLAUDE.md` antes de mexer no app**.
  Uso, deploy e formato de saída: `vistoria-ev/README.md`.

A raiz fica livre para outros projetos (o nome `insta-ai` veio de um projeto de Instagram que ainda não existe aqui).

## Como trabalhar com o Gabriel
- Responder em **português do Brasil**, direto e prático. Ele escreve rápido e por voz: interpretar a intenção, não a digitação.
- **Antes de feature grande: apresentar o plano de arquivos e esperar o OK.** Mudanças pequenas e pedidas explicitamente podem ir direto.
- Evolução incremental: não reescrever o que funciona, preservar dados já gravados no aparelho.
- Simples primeiro; só adicionar biblioteca com motivo forte.
- Nada de segredo/token no código ou no chat.
- **Não expor nada na rede local**: scripts de dev/preview sem `--host`.
- Ele usa **iPhone**. Testar pensando no Safari/iOS (PWA instalada, câmera via `<input capture>`, armazenamento que o iOS pode apagar).

## Fluxo de trabalho
- Branch de trabalho: `claude/pwa-vistoria-ev-ftxrhl` (hoje é o único branch e o padrão do repositório).
- Validar antes de commitar: `cd vistoria-ev && npm install && npm run build` (roda `tsc` + build).
- Teste ponta a ponta com o Chromium/Playwright do ambiente: criar vistoria, fotografar, cadastrar antenas, exportar e conferir o ZIP; recarregar e conferir que nada sumiu.
- Commits pequenos e descritivos em português. Não abrir PR sem ele pedir.

## Estado atual (nov/2026)
Pronto e testado: registro do site, checklist de 43 itens com fotos e nomes padronizados, patologias, pranchas, tabela de antenas,
exportação ZIP (pastas + registro.txt/json + antenas.csv), validação de campos, data/GPS/carimbo nas fotos,
alerta de foto escura/tremida com "Refazer", "Próximo pendente", importar ZIP como backup, lembrete de exportação após 24 h.

Ainda não testado em aparelho real (só em navegador simulado): instalação no iPhone, câmera, GPS, Web Share do ZIP.
Os limites da checagem de foto (`qualidadeFoto` em `vistoria-ev/src/config/ev.ts`) são hipótese: calibrar com fotos reais.

## Próximos passos
1. **Publicar na Vercel**: importar o repo, Root Directory = `vistoria-ev`, preset Vite. Abrir no Safari do iPhone e instalar.
2. **Relatório fotográfico em PDF** a partir da vistoria: capa com dados do site, fotos com legenda (item/descrição) na ordem do checklist,
   tabela de antenas no fim. Pedir ao Gabriel um modelo da KK; sem modelo, fazer versão genérica primeiro.
3. Tabela de antenas no formato da planilha da KK (precisa do modelo).
4. Depois, se houver demanda: configs de FD e rooftop (novo arquivo em `vistoria-ev/src/config/`), rascunho de silhueta a partir da tabela de antenas.

## Prévia no claude.ai
`npx vite build --mode artifact` gera uma versão sem service worker que roda dentro de uma página do claude.ai
(junte CSS e JS num único HTML). Serve só para ver as telas: lá não instala, não funciona offline, não baixa arquivo e não tem GPS.
