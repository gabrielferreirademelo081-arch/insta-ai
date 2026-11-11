import type { jsPDF as JsPDF } from 'jspdf';
import type { Vistoria } from '../db/schema';
import { obterDadosFoto } from '../db/repo';
import { calcularPendencias, carregarDados, nomesFinais, type DadosVistoria, type FotoExport, type Pendencias } from './export';
import { formatarDataHora } from './fotos';
import { mesmaAntena, pad, prefixo, rotuloAntena } from './naming';
import { itemKey, itemKeyDoSlot, mapaSlots, parseItemKey, resumoItens, ROTULO_STATUS, tituloSlot } from './slots';

/**
 * Relatório fotográfico em PDF (A4):
 * capa com dados do site e resumo → fotos por pasta, 6 por página, com legenda → tabela de antenas (paisagem).
 * Cabeçalho e "Página X de Y" em todas as páginas.
 */

type RGB = [number, number, number];
const AZUL: RGB = [11, 61, 145];
const AZUL_CLARO: RGB = [230, 238, 252];
const ZEBRA: RGB = [244, 247, 252];
const CINZA: RGB = [91, 100, 114];
const BORDA: RGB = [205, 212, 222];
const LARANJA: RGB = [255, 224, 178];

const M = 12; // margem lateral (mm)
const TOPO = 20; // início do conteúdo (abaixo do cabeçalho)
const BASE = 284; // fim do conteúdo retrato (acima do rodapé)

/** A fonte padrão do PDF só tem Latin-1 (+ alguns sinais). O resto vira equivalente ou "?". */
const EXTRAS_WINANSI = '—–‘’“”•…€™‰';
export function textoPdf(s: string | undefined | null): string {
  return (s ?? '')
    .replace(/[ϕφΦ]/g, 'Ø')
    .replace(/[≤]/g, '<=')
    .replace(/[≥]/g, '>=')
    .replace(/[^\u0000-ÿ]/g, (c) => (EXTRAS_WINANSI.includes(c) ? c : '?'));
}

const dataBR = (iso?: string) =>
  iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('/') : iso || '-';

/** Reduz a foto para o PDF (o original fica no ZIP). */
async function reduzirFoto(dados: ArrayBuffer, max = 1400, q = 0.8): Promise<{ bytes: Uint8Array; w: number; h: number }> {
  const bmp = await createImageBitmap(new Blob([dados], { type: 'image/jpeg' }));
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  const blob = await new Promise<Blob>((ok, erro) =>
    c.toBlob((b) => (b ? ok(b) : erro(new Error('Falha ao preparar foto para o PDF'))), 'image/jpeg', q),
  );
  const out = { bytes: new Uint8Array(await blob.arrayBuffer()), w: c.width, h: c.height };
  c.width = c.height = 0;
  return out;
}

const NOME_PASTA: Record<string, string> = {
  GERAIS: 'Fotos gerais',
  FACES: 'Faces da EV',
  VISADAS: 'Visadas',
  ANTENAS: 'Antenas e equipamentos',
  TORRE: 'Estrutura (torre)',
  PATOLOGIAS: 'Patologias encontradas',
  PRANCHAS: 'Pranchas (croqui, silhueta, emendas)',
};

/** Monta o PDF a partir dos dados já carregados (usado pelo botão e pela exportação do ZIP). */
export async function montarPdf(
  d: DadosVistoria,
  nomes: FotoExport[],
  pend: Pendencias,
  onProgresso?: (msg: string) => void,
): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const { cfg, v } = d;
  const campos = v.campos;
  const T = textoPdf;
  const slots = mapaSlots(d.slots);
  const doc: JsPDF = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const obra = campos[cfg.campoObra] || 'Sem obra';
  const site = campos[cfg.campoIdSite] || 'sem ID';
  const largura = () => doc.internal.pageSize.getWidth();
  const util = () => largura() - 2 * M;

  const cor = (c: RGB, tipo: 'fill' | 'draw' | 'text') =>
    tipo === 'fill' ? doc.setFillColor(...c) : tipo === 'draw' ? doc.setDrawColor(...c) : doc.setTextColor(...c);
  const fonte = (tam: number, peso: 'normal' | 'bold' = 'normal', c: RGB = [20, 24, 31]) => {
    doc.setFont('helvetica', peso).setFontSize(tam);
    cor(c, 'text');
  };
  const linhas = (txt: string, w: number) => doc.splitTextToSize(T(txt), w) as string[];

  let y = TOPO;
  const novaPagina = (orientacao: 'portrait' | 'landscape' = 'portrait') => {
    doc.addPage('a4', orientacao);
    y = TOPO;
  };
  const garantir = (h: number) => {
    if (y + h > BASE) novaPagina();
  };
  /** Faixa de título de seção. */
  const faixa = (titulo: string, h = 7) => {
    garantir(h + 4);
    cor(AZUL, 'fill');
    doc.rect(M, y, util(), h, 'F');
    fonte(10, 'bold', [255, 255, 255]);
    doc.text(T(titulo), M + 3, y + h / 2 + 1.3);
    y += h + 3;
  };

  // ================= CAPA =================
  cor(AZUL, 'fill');
  doc.rect(0, 0, largura(), 48, 'F');
  fonte(22, 'bold', [255, 255, 255]);
  doc.text('RELATÓRIO FOTOGRÁFICO', M, 19);
  fonte(11, 'normal', [220, 230, 250]);
  doc.text(T(`Vistoria de ${cfg.nome}`), M, 27);
  fonte(17, 'bold', [255, 255, 255]);
  doc.text(T(`Obra ${obra}  ·  Site ${site}`), M, 40);
  y = 58;

  // Dados do site: grade de 2 colunas por grupo
  const colW = (util() - 4) / 2;
  for (const g of cfg.registro) {
    const cs = g.campos.filter((c) => c.key !== cfg.campoCarimbo && c.tipo !== 'textoLongo');
    if (!cs.length) continue;
    faixa(g.titulo.toUpperCase(), 6);
    for (let i = 0; i < cs.length; i += 2) {
      const par = cs.slice(i, i + 2).map((c) => {
        const bruto = (campos[c.key] ?? '').trim();
        const val = c.tipo === 'data' ? dataBR(bruto) : bruto || '-';
        return { c, ls: linhas(val, colW - 4) };
      });
      const h = 6 + Math.max(...par.map((p) => p.ls.length)) * 4;
      garantir(h + 1);
      par.forEach((p, j) => {
        const x = M + j * (colW + 4);
        cor(BORDA, 'draw');
        doc.setLineWidth(0.2);
        doc.rect(x, y, colW, h);
        fonte(7, 'normal', CINZA);
        doc.text(T(p.c.label), x + 2, y + 3.3);
        fonte(9.5, 'bold');
        doc.text(p.ls, x + 2, y + 7.5);
      });
      y += h + 1.5;
    }
    y += 2;
  }
  for (const c of cfg.registro.flatMap((g) => g.campos).filter((c) => c.tipo === 'textoLongo')) {
    const val = (campos[c.key] ?? '').trim();
    if (!val) continue;
    faixa(c.label.toUpperCase(), 6);
    fonte(9.5);
    for (const l of linhas(val, util() - 4)) {
      garantir(5);
      doc.text(l, M + 2, y + 3);
      y += 4.4;
    }
    y += 3;
  }

  // ================= RESUMO =================
  const resumoC = resumoItens(cfg, 'C', campos, slots, d.fotos);
  const completos = resumoC.filter((r) => r.completo).length;
  const encontradas = cfg.patologias.filter((p) => slots.get(itemKey('P', p.num))?.estado === 'ENCONTRADA');
  faixa('RESUMO DA VISTORIA');
  const indicadores: [string, string][] = [
    ['Itens do checklist completos', `${completos}/${resumoC.length}`],
    ['Fotos no relatório', String(nomes.length)],
    ['Antenas cadastradas', String(d.antenas.length)],
    ['Patologias encontradas', String(encontradas.length)],
    ['Pendências', String(pend.total)],
  ];
  const cw = util() / indicadores.length;
  garantir(18);
  indicadores.forEach(([rot, val], i) => {
    const x = M + i * cw;
    cor(AZUL_CLARO, 'fill');
    doc.rect(x + 0.5, y, cw - 1, 16, 'F');
    fonte(15, 'bold', i === 4 && pend.total ? [180, 35, 24] : AZUL);
    doc.text(val, x + cw / 2, y + 7.5, { align: 'center' });
    fonte(6.5, 'normal', CINZA);
    doc.text(linhas(rot, cw - 3), x + cw / 2, y + 11.5, { align: 'center' });
  });
  y += 20;

  const lista = (titulo: string, itens: string[]) => {
    if (!itens.length) return;
    garantir(10);
    fonte(9.5, 'bold');
    doc.text(T(titulo), M, y + 3);
    y += 6;
    fonte(8.5);
    for (const it of itens) {
      const ls = linhas(`•  ${it}`, util() - 4);
      garantir(ls.length * 3.8 + 1);
      doc.text(ls, M + 2, y + 2.5);
      y += ls.length * 3.8 + 0.6;
    }
    y += 3;
  };
  lista(
    'Patologias encontradas',
    encontradas.map((p) => {
      const obs = slots.get(itemKey('P', p.num))?.justificativa.trim();
      return `${pad(p.num, 2)} ${p.titulo}${obs ? ` — ${obs}` : ''}`;
    }),
  );
  lista(
    'Itens sem foto (justificados)',
    [...resumoC, ...resumoItens(cfg, 'PR', campos, slots, d.fotos)].flatMap((r) =>
      r.slots
        .filter((s) => s.status === 'NAO_TEM' || s.status === 'OUTRO')
        .map((s) => `${tituloSlot(cfg, campos, s.key)}: ${ROTULO_STATUS[s.status]} — ${s.slot?.justificativa.trim()}`),
    ),
  );
  lista('Pendências', [
    ...pend.registro,
    ...pend.checklist,
    ...pend.patologias,
    ...pend.pranchas,
    ...pend.antenas,
    ...pend.valores,
  ]);

  // ================= FOTOS =================
  const FOTO_GAP = 6;
  const fotoW = (util() - FOTO_GAP) / 2;
  const LEGENDA_H = 16;
  const pastas = [...cfg.pastas.map((p) => p.nome), cfg.pastaPadrao];
  let feitas = 0;
  for (const pasta of pastas) {
    const fotosPasta = nomes.filter((n) => n.pasta === pasta);
    if (!fotosPasta.length) continue;
    const titulo = `${(NOME_PASTA[pasta] ?? pasta).toUpperCase()}  ·  ${fotosPasta.length} foto(s)`;
    for (let i = 0; i < fotosPasta.length; i++) {
      const pos = i % 6;
      if (pos === 0) {
        novaPagina();
        faixa(i === 0 ? titulo : `${(NOME_PASTA[pasta] ?? pasta).toUpperCase()}  (continuação)`);
      }
      const gradeTopo = TOPO + 10;
      const celulaH = (BASE - gradeTopo) / 3;
      const fotoH = celulaH - LEGENDA_H - 3;
      const x = M + (pos % 2) * (fotoW + FOTO_GAP);
      const yy = gradeTopo + Math.floor(pos / 2) * celulaH;
      const n = fotosPasta[i];
      onProgresso?.(`Relatório: foto ${++feitas}/${nomes.length}`);

      cor(BORDA, 'draw');
      doc.setLineWidth(0.2);
      doc.rect(x, yy, fotoW, fotoH);
      const dados = await obterDadosFoto(n.foto.id);
      if (dados) {
        const img = await reduzirFoto(dados);
        const k = Math.min((fotoW - 2) / img.w, (fotoH - 2) / img.h);
        const w = img.w * k;
        const h = img.h * k;
        doc.addImage(img.bytes, 'JPEG', x + (fotoW - w) / 2, yy + (fotoH - h) / 2, w, h, undefined, 'NONE');
      } else {
        fonte(8, 'normal', CINZA);
        doc.text('(foto indisponível)', x + fotoW / 2, yy + fotoH / 2, { align: 'center' });
      }

      // Legenda
      const ik = itemKeyDoSlot(n.foto.itemId);
      const ehPatologia = parseItemKey(ik)?.secao === 'P';
      let leg = tituloSlot(cfg, campos, n.foto.itemId);
      if (n.foto.antena) leg += ` · Antena ${rotuloAntena(n.foto.antena)}`;
      const obs = ehPatologia ? slots.get(n.foto.itemId)?.justificativa.trim() : '';
      if (obs) leg += ` — ${obs}`;
      let ly = yy + fotoH + 3.6;
      fonte(8.3, 'bold');
      const l1 = linhas(leg, fotoW).slice(0, 2);
      doc.text(l1, x, ly);
      ly += l1.length * 3.6;
      fonte(7, 'normal', CINZA);
      const meta = [
        n.foto.capturadaEm ? formatarDataHora(n.foto.capturadaEm) : '',
        n.foto.gps ? `GPS ${n.foto.gps}` : 'sem GPS',
        n.foto.alerta ? `foto ${n.foto.alerta}` : '',
      ]
        .filter(Boolean)
        .join('  ·  ');
      doc.text(T(meta), x, ly);
      doc.text(linhas(n.nome, fotoW)[0], x, ly + 3.3);
    }
  }

  // ================= ANTENAS (paisagem) =================
  novaPagina('landscape');
  const W = largura();
  const H = doc.internal.pageSize.getHeight();
  const baseP = H - 13;
  const colunas = [...cfg.antena.map((c) => ({ key: c.key, label: c.label })), { key: '__fotos', label: 'Fotos item 43' }];
  const linhasTab = d.antenas.map((a) =>
    colunas.map((c) =>
      c.key === '__fotos'
        ? String(d.fotos.filter((f) => mesmaAntena(f.antena, a.campos.numero)).length)
        : T(a.campos[c.key] ?? ''),
    ),
  );
  // Largura proporcional ao maior conteúdo (limitada).
  const pesos = colunas.map((c, i) =>
    Math.min(18, Math.max(5, Math.max(...c.label.split(' ').map((p) => p.length), ...linhasTab.map((l) => l[i].length)))),
  );
  const soma = pesos.reduce((a, b) => a + b, 0);
  const larg = pesos.map((p) => (p / soma) * (W - 2 * M));

  const tituloTabela = (cont: boolean) => {
    fonte(13, 'bold', AZUL);
    doc.text(`Tabela de antenas${cont ? ' (continuação)' : ` · ${d.antenas.length} antena(s)`}`, M, y + 4);
    y += 9;
  };
  const cabecalhoTabela = () => {
    fonte(7, 'bold', [255, 255, 255]);
    const ls = colunas.map((c, i) => linhas(c.label, larg[i] - 2));
    const h = Math.max(...ls.map((l) => l.length)) * 3 + 3;
    cor(AZUL, 'fill');
    doc.rect(M, y, W - 2 * M, h, 'F');
    let x = M;
    ls.forEach((l, i) => {
      doc.text(l, x + larg[i] / 2, y + 3.6, { align: 'center' });
      x += larg[i];
    });
    y += h;
  };
  tituloTabela(false);
  cabecalhoTabela();
  if (!linhasTab.length) {
    fonte(9, 'normal', CINZA);
    doc.text('Nenhuma antena cadastrada.', M + 2, y + 5);
    y += 9;
  }
  const iOperadora = colunas.findIndex((c) => c.key === 'operadora');
  linhasTab.forEach((lin, r) => {
    fonte(7.5);
    const ls = lin.map((txt, i) => linhas(txt, larg[i] - 2));
    const h = Math.max(...ls.map((l) => l.length)) * 3.1 + 2.6;
    if (y + h > baseP) {
      novaPagina('landscape');
      tituloTabela(true);
      cabecalhoTabela();
      fonte(7.5);
    }
    let x = M;
    ls.forEach((l, i) => {
      const vazioObrig = i === iOperadora && !lin[i].trim();
      if (vazioObrig || r % 2 === 1) {
        cor(vazioObrig ? LARANJA : ZEBRA, 'fill');
        doc.rect(x, y, larg[i], h, 'F');
      }
      cor(BORDA, 'draw');
      doc.setLineWidth(0.15);
      doc.rect(x, y, larg[i], h);
      fonte(7.5, i === 0 ? 'bold' : 'normal');
      doc.text(l, x + larg[i] / 2, y + 3.6, { align: 'center' });
      x += larg[i];
    });
    y += h;
  });
  y += 6;
  const extras = cfg.antenaExtras;
  if (extras.length) {
    if (y + extras.length * 5 + 8 > baseP) novaPagina('landscape');
    fonte(9, 'bold', AZUL);
    doc.text('Esteira e ocupação de cabos', M, y + 3);
    y += 7;
    for (const c of extras) {
      fonte(8.5, 'bold');
      doc.text(T(`${c.label}:`), M, y + 3);
      fonte(8.5);
      doc.text(T((campos[c.key] ?? '').trim() || '-'), M + 62, y + 3);
      y += 5;
    }
  }

  // ================= CABEÇALHO E RODAPÉ =================
  const total = doc.getNumberOfPages();
  const geradoEm = new Date().toLocaleString('pt-BR');
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    if (p > 1) {
      fonte(8, 'bold', AZUL);
      doc.text(T(`Obra ${obra} · Site ${site}`), M, 11);
      fonte(8, 'normal', CINZA);
      doc.text(T(`Relatório fotográfico · ${dataBR(campos.data)}`), pw - M, 11, { align: 'right' });
      cor(AZUL, 'draw');
      doc.setLineWidth(0.4);
      doc.line(M, 13.5, pw - M, 13.5);
    }
    cor(BORDA, 'draw');
    doc.setLineWidth(0.2);
    doc.line(M, ph - 9, pw - M, ph - 9);
    fonte(7, 'normal', CINZA);
    doc.text(T(`Vistoria EV · KK Projetos · gerado em ${geradoEm}`), M, ph - 5);
    doc.text(`Página ${p} de ${total}`, pw - M, ph - 5, { align: 'right' });
  }

  return doc.output('blob');
}

/** Gera só o PDF. Não marca a vistoria como exportada: o PDF não serve de backup (só o ZIP). */
export async function gerarPdf(
  v: Vistoria,
  onProgresso?: (msg: string) => void,
): Promise<{ blob: Blob; nome: string }> {
  const d = await carregarDados(v);
  const blob = await montarPdf(d, nomesFinais(d), calcularPendencias(d), onProgresso);
  return { blob, nome: `${prefixo(d.cfg, v.campos)}_relatorio.pdf` };
}
