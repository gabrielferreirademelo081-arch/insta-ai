/**
 * Planilha .xlsx formatada da tabela de antenas.
 * Monta o pacote OOXML à mão com jszip (sem biblioteca de planilha).
 */
import JSZip from 'jszip';
import type { DadosVistoria } from './export';
import { mesmaAntena } from './naming';
import { numero } from './validacao';

const ABA = 'Antenas';
const LINHA_CAB = 4;
const LARG_MIN = 8;
const LARG_MAX = 28;

/** Índices de estilo (cellXfs em styles.xml). */
const S = {
  titulo: 1,
  cabecalho: 2,
  texto: 3,
  textoZebra: 4,
  num: 5,
  numZebra: 6,
  alerta: 7,
  rotulo: 8,
  vazio: 9,
} as const;

/** Remove caracteres proibidos em XML e escapa os especiais. */
function esc(s: string): string {
  return s
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 0 → A, 25 → Z, 26 → AA. */
function col(i: number): string {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

const ref = (c: number, r: number) => `${col(c)}${r}`;

function celTexto(c: number, r: number, valor: string, s: number): string {
  const t = esc(valor);
  if (!t) return `<c r="${ref(c, r)}" s="${s}"/>`;
  const sp = /^\s|\s$/.test(t) ? ' xml:space="preserve"' : '';
  return `<c r="${ref(c, r)}" s="${s}" t="inlineStr"><is><t${sp}>${t}</t></is></c>`;
}

function celNum(c: number, r: number, n: number, s: number): string {
  return `<c r="${ref(c, r)}" s="${s}"><v>${n}</v></c>`;
}

/** aaaa-mm-dd → dd/mm/aaaa; outro formato fica como veio. */
function dataBr(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec((s ?? '').trim());
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (s ?? '').trim();
}

/** Largura "visual": palavra mais longa do cabeçalho (ele quebra linha) ou valor mais longo. */
function largura(textos: string[], cabecalho: string): number {
  const palavra = Math.max(0, ...cabecalho.split(/\s+/).map((p) => p.length));
  const valor = Math.max(0, ...textos.map((t) => t.length));
  const w = Math.max(palavra, valor, Math.ceil(cabecalho.length / 2)) + 2;
  return Math.min(LARG_MAX, Math.max(LARG_MIN, w));
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="4">
<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="14"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="5">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF0B3D91"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFEEF3FB"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFE0B2"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FF9AA5B1"/></left><right style="thin"><color rgb="FF9AA5B1"/></right><top style="thin"><color rgb="FF9AA5B1"/></top><bottom style="thin"><color rgb="FF9AA5B1"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="10">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

export async function gerarXlsx(d: DadosVistoria): Promise<Blob> {
  const campos = d.cfg.antena;
  const nCols = campos.length + 1;
  const ultCol = col(nCols - 1);
  const obra = (d.v.campos[d.cfg.campoObra] ?? '').trim();
  const site = (d.v.campos[d.cfg.campoIdSite] ?? '').trim();
  const titulo = 'Tabela de antenas — ' + [obra || 'sem obra', site || 'sem ID'].join(' · ');
  const data = dataBr(d.v.campos.data ?? '');
  const vistoriador = (d.v.campos.vistoriador ?? '').trim();

  const linhas: string[] = [];
  const textosCol: string[][] = Array.from({ length: nCols }, () => []);

  // Linha 1: título (mesclado). Linha 2: data e vistoriador.
  linhas.push(`<row r="1" ht="22" customHeight="1">${celTexto(0, 1, titulo, S.titulo)}</row>`);
  linhas.push(
    `<row r="2">${celTexto(0, 2, `Data: ${data || '-'}    Vistoriador: ${vistoriador || '-'}`, 0)}</row>`,
  );

  // Linha 4: cabeçalho.
  const cab = [...campos.map((c) => c.label), 'Fotos item 43'];
  linhas.push(
    `<row r="${LINHA_CAB}" ht="32" customHeight="1">${cab.map((t, i) => celTexto(i, LINHA_CAB, t, S.cabecalho)).join('')}</row>`,
  );

  // Dados.
  let r = LINHA_CAB;
  const merges = [`A1:${ultCol}1`];
  if (d.antenas.length === 0) {
    r++;
    merges.push(`A${r}:${ultCol}${r}`);
    linhas.push(`<row r="${r}">${celTexto(0, r, 'Nenhuma antena cadastrada.', S.vazio)}</row>`);
  }
  d.antenas.forEach((a, idx) => {
    r++;
    const zebra = idx % 2 === 1;
    const cels = campos.map((c, i) => {
      const valor = (a.campos[c.key] ?? '').trim();
      textosCol[i].push(valor);
      // Obrigatório vazio (ex.: operadora) fica em laranja.
      if (!valor && c.obrigatorio) return celTexto(i, r, '', S.alerta);
      if (c.tipo === 'numero') {
        const n = numero(valor);
        if (n !== null) return celNum(i, r, n, zebra ? S.numZebra : S.num);
      }
      return celTexto(i, r, valor, zebra ? S.textoZebra : S.texto);
    });
    const nFotos = d.fotos.filter((f) => mesmaAntena(f.antena, a.campos.numero)).length;
    textosCol[nCols - 1].push(String(nFotos));
    cels.push(celNum(nCols - 1, r, nFotos, zebra ? S.numZebra : S.num));
    linhas.push(`<row r="${r}">${cels.join('')}</row>`);
  });
  const ultLinhaTabela = r;

  // Campos extras abaixo da tabela.
  r++;
  for (const c of d.cfg.antenaExtras) {
    r++;
    const valor = (d.v.campos[c.key] ?? '').trim() || '-';
    textosCol[0].push(c.label);
    linhas.push(`<row r="${r}">${celTexto(0, r, c.label, S.rotulo)}${celTexto(1, r, valor, 0)}</row>`);
  }

  const cols = cab
    .map((t, i) => {
      const w = largura(textosCol[i], t);
      return `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`;
    })
    .join('');

  const filtro = `A${LINHA_CAB}:${ultCol}${ultLinhaTabela}`;
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<dimension ref="A1:${ultCol}${Math.max(r, ultLinhaTabela)}"/>
<sheetViews><sheetView workbookViewId="0" tabSelected="1"><pane ySplit="${LINHA_CAB}" topLeftCell="A${LINHA_CAB + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${LINHA_CAB + 1}" sqref="A${LINHA_CAB + 1}"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols}</cols>
<sheetData>${linhas.join('')}</sheetData>
<autoFilter ref="${filtro}"/>
<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>
<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>
<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;

  const abs = `'${ABA}'!$A$${LINHA_CAB}:$${ultCol}$${ultLinhaTabela}`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<bookViews><workbookView/></bookViews>
<sheets><sheet name="${ABA}" sheetId="1" r:id="rId1"/></sheets>
<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">${abs}</definedName><definedName name="_xlnm.Print_Titles" localSheetId="0">'${ABA}'!$${LINHA_CAB}:$${LINHA_CAB}</definedName></definedNames>
</workbook>`;

  const zip = new JSZip();
  zip.file('[Content_Types].xml', CONTENT_TYPES);
  zip.file('_rels/.rels', RELS);
  zip.file('xl/workbook.xml', workbook);
  zip.file('xl/_rels/workbook.xml.rels', WORKBOOK_RELS);
  zip.file('xl/styles.xml', STYLES);
  zip.file('xl/worksheets/sheet1.xml', sheet);
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    compression: 'DEFLATE',
  });
}
