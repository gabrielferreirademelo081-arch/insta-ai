import JSZip from 'jszip';
import { getConfig } from '../config';
import type { CampoDef, TipoConfig } from '../config/types';
import { listarAntenas, listarFotos, listarSlots, marcarExportada, obterDadosFoto } from '../db/repo';
import type { Antena, Foto, SlotChecklist, Vistoria } from '../db/schema';
import { mesmaAntena, nomeFoto, pad, prefixo, rotuloAntena } from './naming';
import {
  contarFotos,
  itemKey,
  mapaSlots,
  pastaDoSlot,
  partesNome,
  resumoItens,
  ROTULO_STATUS,
  tituloSlot,
  type ResumoItem,
} from './slots';

export interface DadosVistoria {
  v: Vistoria;
  cfg: TipoConfig;
  slots: SlotChecklist[];
  fotos: Foto[];
  antenas: Antena[];
}

export async function carregarDados(v: Vistoria): Promise<DadosVistoria> {
  const [slots, fotos, antenas] = await Promise.all([listarSlots(v.id), listarFotos(v.id), listarAntenas(v.id)]);
  return { v, cfg: getConfig(v.tipo), slots, fotos, antenas };
}

// ---------------- Pendências ----------------

export interface Pendencias {
  registro: string[];
  checklist: string[];
  patologias: string[];
  pranchas: string[];
  antenas: string[];
  total: number;
}

function pendentesDe(resumo: ResumoItem[], d: DadosVistoria): string[] {
  const out: string[] = [];
  for (const r of resumo)
    for (const s of r.slots)
      if (s.status === 'PENDENTE' || s.status === 'SEM_JUSTIFICATIVA')
        out.push(
          tituloSlot(d.cfg, d.v.campos, s.key) + (s.status === 'SEM_JUSTIFICATIVA' ? ' (falta justificativa)' : ''),
        );
  return out;
}

export function calcularPendencias(d: DadosVistoria): Pendencias {
  const { cfg, v } = d;
  const slots = mapaSlots(d.slots);
  const registro = cfg.registro
    .flatMap((g) => g.campos)
    .filter((c) => c.obrigatorio && !(v.campos[c.key] ?? '').trim())
    .map((c) => `${c.label} não preenchido`);

  const checklist = pendentesDe(resumoItens(cfg, 'C', v.campos, slots, d.fotos), d);
  const pranchas = pendentesDe(resumoItens(cfg, 'PR', v.campos, slots, d.fotos), d);

  const n = contarFotos(d.fotos);
  const patologias: string[] = [];
  for (const p of cfg.patologias) {
    const k = itemKey('P', p.num);
    const s = slots.get(k);
    if (s?.estado !== 'ENCONTRADA') continue;
    if (!(n.get(k) ?? 0)) patologias.push(`${pad(p.num, 2)} ${p.titulo}: encontrada sem foto`);
    if (p.textoLivre && !s.justificativa.trim()) patologias.push(`${pad(p.num, 2)} ${p.titulo}: falta descrição`);
  }

  const antenas: string[] = [];
  const campoObrig = cfg.antena.filter((c) => c.obrigatorio);
  const vistos = new Set<string>();
  d.antenas.forEach((a, i) => {
    const nome = `Antena ${a.campos.numero || `(linha ${i + 1})`}`;
    for (const c of campoObrig) if (!(a.campos[c.key] ?? '').trim()) antenas.push(`${nome}: ${c.label} obrigatória`);
    const num = a.campos.numero?.trim();
    if (!num) antenas.push(`${nome}: sem número`);
    else if (vistos.has(rotuloAntena(num))) antenas.push(`${nome}: número repetido`);
    else vistos.add(rotuloAntena(num));
  });

  return {
    registro,
    checklist,
    patologias,
    pranchas,
    antenas,
    total: registro.length + checklist.length + patologias.length + pranchas.length + antenas.length,
  };
}

// ---------------- Nomes finais ----------------

export interface FotoExport {
  foto: Foto;
  nome: string;
  pasta: string;
}

/** Recalcula nomes na exportação (obra/ID podem ter mudado; fotos podem ter sido excluídas). */
export function nomesFinais(d: DadosVistoria): FotoExport[] {
  const pref = prefixo(d.cfg, d.v.campos);
  const grupos = new Map<string, Foto[]>();
  for (const f of d.fotos) {
    const g = `${f.itemId}|${f.antena ? rotuloAntena(f.antena) : ''}`;
    if (!grupos.has(g)) grupos.set(g, []);
    grupos.get(g)!.push(f);
  }
  const usados = new Set<string>();
  const out: FotoExport[] = [];
  for (const lista of grupos.values()) {
    lista.sort((a, b) => a.ordem - b.ordem);
    lista.forEach((f, i) => {
      const { codigo, desc } = partesNome(d.cfg, d.v.campos, f.itemId, f.antena);
      let nome = nomeFoto(pref, codigo, desc, i + 1);
      let extra = 1;
      while (usados.has(nome)) nome = nomeFoto(pref, codigo, `${desc}-${++extra}`, i + 1);
      usados.add(nome);
      out.push({ foto: f, nome, pasta: pastaDoSlot(d.cfg, f.itemId) });
    });
  }
  return out.sort((a, b) => a.nome.localeCompare(b.nome));
}

// ---------------- Textos ----------------

const valor = (c: CampoDef, campos: Record<string, string>) => {
  const v = (campos[c.key] ?? '').trim();
  if (c.tipo === 'data' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v.split('-').reverse().join('/');
  return v;
};

function linhaPontilhada(esq: string, dir: string, largura = 72): string {
  const pontos = Math.max(2, largura - esq.length - dir.length - 2);
  return `${esq} ${'.'.repeat(pontos)} ${dir}`;
}

export function gerarTxt(d: DadosVistoria, nomes: FotoExport[], pend: Pendencias): string {
  const { cfg, v } = d;
  const slots = mapaSlots(d.slots);
  const L: string[] = [];
  const titulo = (t: string) => L.push('', '='.repeat(72), t, '='.repeat(72));
  const nomesPorSlot = new Map<string, string[]>();
  for (const n of nomes) {
    if (!nomesPorSlot.has(n.foto.itemId)) nomesPorSlot.set(n.foto.itemId, []);
    nomesPorSlot.get(n.foto.itemId)!.push(n.nome);
  }

  L.push(`RELATÓRIO DE VISTORIA — ${cfg.nome}`);
  L.push(`Obra KK: ${v.campos[cfg.campoObra] || '-'}   |   Site: ${v.campos[cfg.campoIdSite] || '-'}`);
  L.push(`Exportado em: ${new Date().toLocaleString('pt-BR')}`);

  titulo('DADOS DO SITE');
  for (const g of cfg.registro) {
    L.push('', `[${g.titulo}]`);
    for (const c of g.campos) {
      const val = valor(c, v.campos);
      if (c.tipo === 'textoLongo') L.push(`${c.label}:`, ...(val ? val.split('\n').map((x) => `  ${x}`) : ['  -']));
      else L.push(`${c.label}: ${val || '-'}`);
    }
  }

  const blocoItens = (resumo: ResumoItem[]) => {
    for (const r of resumo) {
      const cab = `${pad(r.item.num, 2)} ${r.item.titulo}`;
      const linhaSlot = (s: ResumoItem['slots'][number], indent: string, label: string) => {
        let st = ROTULO_STATUS[s.status];
        if (s.nFotos) st += ` (${s.nFotos} foto${s.nFotos > 1 ? 's' : ''})`;
        L.push(linhaPontilhada(indent + label, st));
        if (s.slot?.justificativa.trim()) L.push(`${indent}   Justificativa: ${s.slot.justificativa.trim()}`);
      };
      if (!r.temSub) linhaSlot(r.slots[0], '', cab);
      else {
        L.push(`${cab}  [${r.resolvidos}/${r.slots.length}]`);
        for (const s of r.slots) linhaSlot(s, '    ', s.label);
      }
    }
  };

  const resumoC = resumoItens(cfg, 'C', v.campos, slots, d.fotos);
  titulo(`CHECKLIST DE FOTOS (${resumoC.filter((r) => r.completo).length}/${resumoC.length} itens completos)`);
  blocoItens(resumoC);

  titulo('PATOLOGIAS ENCONTRADAS');
  const n = contarFotos(d.fotos);
  const encontradas = cfg.patologias.filter((p) => slots.get(itemKey('P', p.num))?.estado === 'ENCONTRADA');
  if (!encontradas.length) L.push('Nenhuma patologia encontrada.');
  for (const p of encontradas) {
    const k = itemKey('P', p.num);
    const s = slots.get(k)!;
    L.push(`${pad(p.num, 2)} ${p.titulo} — ${n.get(k) ?? 0} foto(s)`);
    if (s.justificativa.trim()) L.push(`   ${p.textoLivre ? 'Descrição' : 'Obs.'}: ${s.justificativa.trim()}`);
  }

  titulo('PRANCHAS (croqui, silhueta, emendas)');
  blocoItens(resumoItens(cfg, 'PR', v.campos, slots, d.fotos));

  titulo(`TABELA DE ANTENAS (${d.antenas.length})`);
  if (!d.antenas.length) L.push('Nenhuma antena cadastrada.');
  d.antenas.forEach((a) => {
    const fotosA = d.fotos.filter((f) => mesmaAntena(f.antena, a.campos.numero)).length;
    L.push('', `Antena ${a.campos.numero || '?'}  (${fotosA} foto(s) no item 43)`);
    for (const c of cfg.antena) {
      if (c.key === 'numero') continue;
      const val = valor(c, a.campos);
      if (val) L.push(`   ${c.label}: ${val}`);
    }
  });
  L.push('');
  for (const c of cfg.antenaExtras) L.push(`${c.label}: ${valor(c, v.campos) || '-'}`);

  titulo(`PENDÊNCIAS (${pend.total})`);
  const blocos: [string, string[]][] = [
    ['Registro', pend.registro],
    ['Checklist de fotos', pend.checklist],
    ['Patologias', pend.patologias],
    ['Pranchas', pend.pranchas],
    ['Antenas', pend.antenas],
  ];
  if (!pend.total) L.push('Nenhuma pendência.');
  for (const [t, lista] of blocos) if (lista.length) L.push('', `${t}:`, ...lista.map((x) => `  - ${x}`));

  titulo('ARQUIVOS DE FOTO');
  for (const x of nomes) L.push(`${x.pasta}/${x.nome}`);
  L.push('');
  return L.join('\r\n');
}

function csvCelula(s: string): string {
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV com ";" e BOM (abre direto no Excel em português). */
export function gerarCsv(d: DadosVistoria): string {
  const cab = [...d.cfg.antena.map((c) => c.label), 'Fotos item 43'];
  const linhas = d.antenas.map((a) => [
    ...d.cfg.antena.map((c) => a.campos[c.key] ?? ''),
    String(d.fotos.filter((f) => mesmaAntena(f.antena, a.campos.numero)).length),
  ]);
  return '﻿' + [cab, ...linhas].map((l) => l.map(csvCelula).join(';')).join('\r\n') + '\r\n';
}

export function gerarJson(d: DadosVistoria, nomes: FotoExport[], pend: Pendencias): string {
  const slots = mapaSlots(d.slots);
  const porSlot = new Map<string, FotoExport[]>();
  for (const n of nomes) {
    if (!porSlot.has(n.foto.itemId)) porSlot.set(n.foto.itemId, []);
    porSlot.get(n.foto.itemId)!.push(n);
  }
  const itens = (secao: 'C' | 'PR') =>
    resumoItens(d.cfg, secao, d.v.campos, slots, d.fotos).flatMap((r) =>
      r.slots.map((s) => ({
        item: r.item.num,
        slot: s.key,
        titulo: tituloSlot(d.cfg, d.v.campos, s.key),
        estado: s.status,
        justificativa: s.slot?.justificativa ?? '',
        fotos: (porSlot.get(s.key) ?? []).map((x) => ({ arquivo: `${x.pasta}/${x.nome}`, antena: x.foto.antena ?? null })),
      })),
    );
  const json = {
    app: 'vistoria-ev',
    formato: 1,
    exportadoEm: new Date().toISOString(),
    vistoria: {
      id: d.v.id,
      tipo: d.v.tipo,
      createdAt: new Date(d.v.createdAt).toISOString(),
      updatedAt: new Date(d.v.updatedAt).toISOString(),
      campos: d.v.campos,
    },
    checklist: itens('C'),
    patologias: d.cfg.patologias.map((p) => {
      const k = itemKey('P', p.num);
      const s = slots.get(k);
      return {
        item: p.num,
        titulo: p.titulo,
        estado: s?.estado === 'ENCONTRADA' ? 'ENCONTRADA' : 'NAO_ENCONTRADA',
        descricao: s?.justificativa ?? '',
        fotos: (porSlot.get(k) ?? []).map((x) => `${x.pasta}/${x.nome}`),
      };
    }),
    pranchas: itens('PR'),
    antenas: d.antenas.map((a) => a.campos),
    pendencias: pend,
  };
  return JSON.stringify(json, null, 2);
}

// ---------------- ZIP ----------------

export async function gerarZip(
  v: Vistoria,
  onProgresso?: (msg: string) => void,
): Promise<{ blob: Blob; nome: string; pendencias: Pendencias }> {
  const d = await carregarDados(v);
  const raiz = prefixo(d.cfg, v.campos);
  const nomes = nomesFinais(d);
  const pend = calcularPendencias(d);
  const zip = new JSZip();
  const pasta = zip.folder(raiz)!;
  for (const p of d.cfg.pastas) pasta.folder(p.nome);

  for (let i = 0; i < nomes.length; i++) {
    onProgresso?.(`Adicionando fotos ${i + 1}/${nomes.length}`);
    const dados = await obterDadosFoto(nomes[i].foto.id);
    if (dados) pasta.file(`${nomes[i].pasta}/${nomes[i].nome}`, dados, { binary: true });
  }
  const txt = { compression: 'DEFLATE' as const };
  pasta.file('registro.json', gerarJson(d, nomes, pend), txt);
  pasta.file('registro.txt', gerarTxt(d, nomes, pend), txt);
  pasta.file('antenas.csv', gerarCsv(d), txt);

  onProgresso?.('Compactando…');
  // JPEG já é comprimido: STORE é bem mais rápido no celular.
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE', mimeType: 'application/zip' });
  await marcarExportada(v.id);
  return { blob, nome: `${raiz}.zip`, pendencias: pend };
}
