import { obterDadosFoto, marcarExportada } from '../db/repo';
import type { Vistoria } from '../db/schema';
import { carregarDados, nomesFinais } from './export';
import { formatarDataHora } from './fotos';
import { mesmaAntena, prefixo } from './naming';
import { tituloSlot } from './slots';

const M = 15; // margem (mm)
const COLS = 2;
const FOTO_W = (210 - 2 * M - 8) / COLS;
const FOTO_H = 62;

/** Relatório fotográfico: capa com dados do site, fotos legendadas na ordem do checklist, tabela de antenas. */
export async function gerarPdf(
  v: Vistoria,
  onProgresso?: (msg: string) => void,
): Promise<{ blob: Blob; nome: string }> {
  const { jsPDF } = await import('jspdf');
  const d = await carregarDados(v);
  const nomes = nomesFinais(d);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const titulo = `Relatório fotográfico — ${d.cfg.nome}`;

  // Capa
  doc.setFontSize(18).setFont('helvetica', 'bold').text(titulo, M, 25);
  doc.setFontSize(10).setFont('helvetica', 'normal');
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, M, 32);
  let y = 42;
  for (const g of d.cfg.registro) {
    if (y > 270) (doc.addPage(), (y = 20));
    doc.setFont('helvetica', 'bold').text(g.titulo, M, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    for (const c of g.campos) {
      const val = (v.campos[c.key] ?? '').trim() || '-';
      const linhas = doc.splitTextToSize(`${c.label}: ${val}`, 210 - 2 * M) as string[];
      if (y + linhas.length * 4.5 > 285) (doc.addPage(), (y = 20));
      doc.text(linhas, M, y);
      y += linhas.length * 4.5;
    }
    y += 4;
  }

  // Fotos (nomesFinais já vem ordenado pelo código do item)
  doc.addPage();
  let i = 0;
  for (const n of nomes) {
    onProgresso?.(`Fotos ${++i}/${nomes.length}`);
    const pos = (i - 1) % (COLS * 4);
    if (pos === 0 && i > 1) doc.addPage();
    const x = M + (pos % COLS) * (FOTO_W + 8);
    const yy = M + Math.floor(pos / COLS) * (FOTO_H + 24);
    const dados = await obterDadosFoto(n.foto.id);
    if (dados) {
      const bytes = new Uint8Array(dados);
      const p = doc.getImageProperties(bytes);
      const k = Math.min(FOTO_W / p.width, FOTO_H / p.height);
      doc.addImage(bytes, 'JPEG', x, yy, p.width * k, p.height * k, undefined, 'FAST');
    }
    const antena = n.foto.antena ? ` (antena ${n.foto.antena})` : '';
    const legenda = `${tituloSlot(d.cfg, v.campos, n.foto.itemId)}${antena}`;
    doc.setFontSize(8).setFont('helvetica', 'bold');
    doc.text(doc.splitTextToSize(legenda, FOTO_W).slice(0, 2), x, yy + FOTO_H + 4);
    doc.setFont('helvetica', 'normal');
    doc.text(n.foto.capturadaEm ? formatarDataHora(n.foto.capturadaEm) : '', x, yy + FOTO_H + 12);
  }

  // Antenas
  doc.addPage();
  doc.setFontSize(14).setFont('helvetica', 'bold').text(`Tabela de antenas (${d.antenas.length})`, M, 22);
  doc.setFontSize(9).setFont('helvetica', 'normal');
  y = 30;
  if (!d.antenas.length) doc.text('Nenhuma antena cadastrada.', M, y);
  for (const a of d.antenas) {
    const fotosA = d.fotos.filter((f) => mesmaAntena(f.antena, a.campos.numero)).length;
    const txt = [
      `Antena ${a.campos.numero || '?'} (${fotosA} foto(s))`,
      ...d.cfg.antena.filter((c) => c.key !== 'numero' && (a.campos[c.key] ?? '').trim()).map((c) => `  ${c.label}: ${a.campos[c.key]}`),
    ];
    if (y + txt.length * 4.2 > 285) (doc.addPage(), (y = 20));
    doc.setFont('helvetica', 'bold').text(txt[0], M, y);
    doc.setFont('helvetica', 'normal').text(txt.slice(1), M, y + 4.2);
    y += txt.length * 4.2 + 3;
  }

  const blob = doc.output('blob');
  await marcarExportada(v.id);
  return { blob, nome: `${prefixo(d.cfg, v.campos)}-relatorio.pdf` };
}
