import type { Campos, ItemDef, PatologiaDef, SubSlotDef, TipoConfig } from '../config/types';
import type { Foto, SlotChecklist } from '../db/schema';
import { pad, rotuloAntena } from './naming';

/**
 * Chaves:
 *  item  -> C03 (checklist), P04 (patologia), PR02 (prancha)
 *  slot  -> item ou item:sub  (C03:A, C33:030, PR02:FRENTE)
 */
export type Secao = 'C' | 'P' | 'PR';

export const itemKey = (s: Secao, num: number) => `${s}${pad(num, 2)}`;

export function parseItemKey(k: string): { secao: Secao; num: number } | null {
  const m = /^(PR|P|C)(\d+)$/.exec(k);
  return m ? { secao: m[1] as Secao, num: Number(m[2]) } : null;
}

export const itemKeyDoSlot = (slotKey: string) => slotKey.split(':')[0];
export const subDoSlot = (slotKey: string): string | undefined => slotKey.split(':')[1];

export function itemDef(cfg: TipoConfig, ik: string): ItemDef | PatologiaDef | undefined {
  const p = parseItemKey(ik);
  if (!p) return undefined;
  const lista = p.secao === 'C' ? cfg.checklist : p.secao === 'PR' ? cfg.pranchas : cfg.patologias;
  return (lista as (ItemDef | PatologiaDef)[]).find((i) => i.num === p.num);
}

/** Sub-slots do item + "órfãos" (fotos de sub-slots que sumiram, ex.: mudou a seção típica). */
export function subslotsDoItem(item: ItemDef, ik: string, campos: Campos, fotos: Foto[]): SubSlotDef[] | null {
  if (!item.subslots) return null;
  const lista = [...item.subslots(campos)];
  const ids = new Set(lista.map((s) => s.id));
  for (const f of fotos) {
    if (itemKeyDoSlot(f.itemId) !== ik) continue;
    const sub = subDoSlot(f.itemId);
    if (sub && !ids.has(sub)) {
      ids.add(sub);
      lista.push({ id: sub, label: `${sub} (fora da configuração atual)`, apelido: sub });
    }
  }
  return lista;
}

export type Status = 'PENDENTE' | 'COM_FOTO' | 'NAO_TEM' | 'OUTRO' | 'SEM_JUSTIFICATIVA';

export function statusSlot(slot: SlotChecklist | undefined, nFotos: number): Status {
  if (slot?.estado === 'NAO_TEM' || slot?.estado === 'OUTRO')
    return slot.justificativa.trim() ? slot.estado : 'SEM_JUSTIFICATIVA';
  return nFotos > 0 ? 'COM_FOTO' : 'PENDENTE';
}

export const resolvido = (s: Status) => s === 'COM_FOTO' || s === 'NAO_TEM' || s === 'OUTRO';

export const ROTULO_STATUS: Record<Status, string> = {
  PENDENTE: 'PENDENTE',
  COM_FOTO: 'COM FOTO',
  NAO_TEM: 'NÃO TEM',
  OUTRO: 'OUTRO',
  SEM_JUSTIFICATIVA: 'FALTA JUSTIFICATIVA',
};

export function contarFotos(fotos: Foto[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const f of fotos) m.set(f.itemId, (m.get(f.itemId) ?? 0) + 1);
  return m;
}

export const mapaSlots = (slots: SlotChecklist[]) => new Map(slots.map((s) => [s.itemId, s]));

export interface ResumoSlot {
  key: string;
  label: string;
  status: Status;
  nFotos: number;
  slot?: SlotChecklist;
}

export interface ResumoItem {
  ik: string;
  item: ItemDef;
  slots: ResumoSlot[];
  resolvidos: number;
  completo: boolean;
  temSub: boolean;
}

/** Status de cada item do checklist de fotos ('C') ou das pranchas ('PR'). */
export function resumoItens(
  cfg: TipoConfig,
  secao: 'C' | 'PR',
  campos: Campos,
  slots: Map<string, SlotChecklist>,
  fotos: Foto[],
): ResumoItem[] {
  const n = contarFotos(fotos);
  const lista = secao === 'C' ? cfg.checklist : cfg.pranchas;
  return lista.map((item) => {
    const ik = itemKey(secao, item.num);
    const subs = subslotsDoItem(item, ik, campos, fotos);
    const defs = subs ? subs.map((s) => ({ key: `${ik}:${s.id}`, label: s.label })) : [{ key: ik, label: item.titulo }];
    const rs: ResumoSlot[] = defs.map((d) => {
      const slot = slots.get(d.key);
      const nFotos = n.get(d.key) ?? 0;
      return { ...d, slot, nFotos, status: statusSlot(slot, nFotos) };
    });
    const resolvidos = rs.filter((r) => resolvido(r.status)).length;
    return { ik, item, slots: rs, resolvidos, completo: resolvidos === rs.length, temSub: !!subs };
  });
}

export function pastaDoSlot(cfg: TipoConfig, slotKey: string): string {
  const p = parseItemKey(itemKeyDoSlot(slotKey));
  if (!p) return cfg.pastaPadrao;
  const pasta = cfg.pastas.find((x) =>
    p.secao === 'P' ? x.patologias : p.secao === 'PR' ? x.pranchas : x.itens?.includes(p.num),
  );
  return pasta?.nome ?? cfg.pastaPadrao;
}

/** Partes {ITEM} e {DESCRICAO} do nome do arquivo. */
export function partesNome(cfg: TipoConfig, campos: Campos, slotKey: string, antena?: string) {
  const ik = itemKeyDoSlot(slotKey);
  const p = parseItemKey(ik);
  const item = itemDef(cfg, ik);
  const codigo = !p ? 'XX' : p.secao === 'C' ? pad(p.num, 2) : `${p.secao}${pad(p.num, 2)}`;
  let desc = item?.apelido ?? 'ITEM';
  const sub = subDoSlot(slotKey);
  if (sub) {
    const s = (item as ItemDef | undefined)?.subslots?.(campos).find((x) => x.id === sub);
    desc += `-${s?.apelido ?? sub}`;
  }
  if (antena?.trim()) desc = `ANTENA-${rotuloAntena(antena)}`;
  return { codigo, desc };
}

/** "03 Faces da EV — Face A" */
export function tituloSlot(cfg: TipoConfig, campos: Campos, slotKey: string): string {
  const ik = itemKeyDoSlot(slotKey);
  const p = parseItemKey(ik);
  const item = itemDef(cfg, ik);
  const prefixoSecao = p?.secao === 'P' ? 'Patologia ' : p?.secao === 'PR' ? 'Prancha ' : '';
  let t = `${prefixoSecao}${p ? pad(p.num, 2) : ik} ${item?.titulo ?? ''}`;
  const sub = subDoSlot(slotKey);
  if (sub) {
    const s = (item as ItemDef | undefined)?.subslots?.(campos).find((x) => x.id === sub);
    t += ` — ${s?.label ?? sub}`;
  }
  return t;
}
