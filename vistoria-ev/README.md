# Vistoria EV — KK Projetos

PWA para mapear EV (estrutura vertical de telecom) em campo, **100% offline**.
Substitui o papel do Relatório de Vistoria, do Checklist de Fotos e da Tabela de Antenas, e exporta um ZIP organizado.
Croqui, silhueta e tabela de emendas continuam à mão; o app só fotografa essas pranchas.

## Rodar local

```bash
cd vistoria-ev
npm install
npm run dev        # http://localhost:5173 (só nesta máquina)
npm run build      # gera dist/
npm run preview    # serve o build (o service worker só funciona no build)
```

> Câmera, GPS e instalação exigem **HTTPS** (ou localhost). Para testar no celular, publique (abaixo).

## Publicar

App estático, sem backend e sem variáveis de ambiente.

**Vercel:** New Project → importe o repositório → *Root Directory* = `vistoria-ev` → Framework *Vite* (build `npm run build`, output `dist`).

**Netlify:** Add new site → importe o repositório → *Base directory* = `vistoria-ev`, *Build command* = `npm run build`, *Publish directory* = `vistoria-ev/dist`.

As rotas usam `#/...`, então não precisa configurar redirect.

## Instalar no celular

- **iPhone (Safari):** Compartilhar → *Adicionar à Tela de Início*. **Obrigatório**: sem instalar, o iOS pode apagar os dados após alguns dias sem uso.
- **Android (Chrome):** menu ⋮ → *Instalar app*.

Abra uma vez com internet; depois funciona em modo avião.

## Uso

1. **Nova vistoria** → aba *Registro* (salva sozinho).
2. Aba *Fotos*: toque no item para abrir a câmera. “›” abre o detalhe (várias fotos, *Não tem*, *Outro* + justificativa).
   A barra azul **Próximo pendente** leva direto ao próximo item que falta. Se a foto sair escura ou tremida, o app oferece **Refazer** na hora.
   Cada foto guarda data/hora e GPS do aparelho e, por padrão, sai carimbada com obra, item, data e GPS (desligue em *Registro → Fotos*).
   Itens 3/4 (faces), 33 (visadas), 38 e 43 abrem direto o detalhe.
3. *Patologias*: padrão “não encontrada”. Encontrada exige foto.
4. *Antenas*: uma linha por antena; “Duplicar linha” e “↑ anterior” por campo. No item 43, informe o nº da antena antes de fotografar.
5. *Pranchas*: croqui, silhueta (frente/verso), tabela de emendas.
6. *Exportar*: lista pendências → **Gerar ZIP** → Compartilhar (Drive, WhatsApp, e-mail) ou Baixar.

**Exporte no fim de cada site.** Os dados ficam só no aparelho.

## Saída

```
{OBRA}_{ID-SITE}.zip
└── {OBRA}_{ID-SITE}/
    ├── GERAIS/ FACES/ VISADAS/ ANTENAS/ TORRE/ PATOLOGIAS/ PRANCHAS/
    ├── registro.txt    (legível: dados, checklist, patologias, antenas, pendências)
    ├── registro.json   (completo, para integração futura)
    └── antenas.csv     (";" + BOM, abre direto no Excel)
```

Nome das fotos: `{OBRA}_{ID-SITE}_{ITEM}_{DESCRICAO}_{SEQ}.jpg`, ex.: `126-843_SPSAO123_33_VISADA-030_001.jpg`.
A barra da obra vira hífen (`126/843` → `126-843`). Patologias usam `P04`, pranchas `PR01`, fotos de antena `43_ANTENA-07`.

## Ajustar checklist, campos e pastas

Tudo em [`src/config/ev.ts`](src/config/ev.ts): campos do registro, itens, apelidos dos arquivos, sub-fotos, patologias, pranchas,
mapeamento item → pasta, faixas de valores aceitos (`min`/`max`), limites da checagem de foto (`qualidadeFoto`) e `bloquearExportComPendentes`.
Para um novo tipo (FD, rooftop): copie `ev.ts`, ajuste e registre em `src/config/index.ts`.
