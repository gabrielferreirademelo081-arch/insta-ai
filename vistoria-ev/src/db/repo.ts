import { getConfig } from '../config';
import type { Campos } from '../config/types';
import { getDB, type Antena, type Foto, type SlotChecklist, type Vistoria } from './schema';

export const novoId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function hojeISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ---------- Vistorias ----------

export async function listarVistorias(): Promise<Vistoria[]> {
  const db = await getDB();
  const todas = await db.getAll('vistorias');
  return todas.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function obterVistoria(id: string): Promise<Vistoria | undefined> {
  return (await getDB()).get('vistorias', id);
}

export async function criarVistoria(tipo: string): Promise<Vistoria> {
  const cfg = getConfig(tipo);
  const campos: Campos = {};
  for (const g of cfg.registro) for (const c of g.campos) if (c.padrao === 'hoje') campos[c.key] = hojeISO();
  const agora = Date.now();
  const v: Vistoria = { id: novoId(), tipo: cfg.tipo, campos, createdAt: agora, updatedAt: agora };
  await (await getDB()).put('vistorias', v);
  return v;
}

export async function salvarVistoria(v: Vistoria): Promise<void> {
  await (await getDB()).put('vistorias', { ...v, updatedAt: Date.now() });
}

/** Grava só os campos, sem sobrescrever outros dados (ex.: data da última exportação). */
export async function salvarCampos(id: string, campos: Campos): Promise<void> {
  const db = await getDB();
  const v = await db.get('vistorias', id);
  if (v) await db.put('vistorias', { ...v, campos, updatedAt: Date.now() });
}

export async function marcarExportada(id: string): Promise<void> {
  const db = await getDB();
  const v = await db.get('vistorias', id);
  if (v) await db.put('vistorias', { ...v, ultimaExportacao: Date.now() });
}

async function tocar(vistoriaId: string): Promise<void> {
  const db = await getDB();
  const v = await db.get('vistorias', vistoriaId);
  if (v) await db.put('vistorias', { ...v, updatedAt: Date.now() });
}

/** Copia registro e antenas (não copia fotos nem checklist: são de outro site). */
export async function duplicarVistoria(id: string): Promise<Vistoria> {
  const db = await getDB();
  const orig = await db.get('vistorias', id);
  if (!orig) throw new Error('Vistoria não encontrada');
  const cfg = getConfig(orig.tipo);
  const campos: Campos = { ...orig.campos };
  for (const g of cfg.registro) for (const c of g.campos) if (c.padrao === 'hoje') campos[c.key] = hojeISO();
  const agora = Date.now();
  const nova: Vistoria = { id: novoId(), tipo: orig.tipo, campos, createdAt: agora, updatedAt: agora };
  const antenas = await db.getAllFromIndex('antenas', 'vistoriaId', id);
  const tx = db.transaction(['vistorias', 'antenas'], 'readwrite');
  await tx.objectStore('vistorias').put(nova);
  for (const a of antenas) await tx.objectStore('antenas').put({ ...a, id: novoId(), vistoriaId: nova.id });
  await tx.done;
  return nova;
}

export async function excluirVistoria(id: string): Promise<void> {
  const db = await getDB();
  const [slots, fotos, antenas] = await Promise.all([
    db.getAllKeysFromIndex('slots', 'vistoriaId', id),
    db.getAllKeysFromIndex('fotos', 'vistoriaId', id),
    db.getAllKeysFromIndex('antenas', 'vistoriaId', id),
  ]);
  const tx = db.transaction(['vistorias', 'slots', 'fotos', 'fotoDados', 'antenas'], 'readwrite');
  for (const k of slots) await tx.objectStore('slots').delete(k);
  for (const k of fotos) {
    await tx.objectStore('fotos').delete(k);
    await tx.objectStore('fotoDados').delete(k);
  }
  for (const k of antenas) await tx.objectStore('antenas').delete(k);
  await tx.objectStore('vistorias').delete(id);
  await tx.done;
}

// ---------- Slots (estado do checklist) ----------

export async function listarSlots(vistoriaId: string): Promise<SlotChecklist[]> {
  return (await getDB()).getAllFromIndex('slots', 'vistoriaId', vistoriaId);
}

export async function salvarSlot(vistoriaId: string, itemId: string, estado: SlotChecklist['estado'], justificativa: string) {
  const db = await getDB();
  const id = `${vistoriaId}|${itemId}`;
  if (!estado && !justificativa) await db.delete('slots', id);
  else await db.put('slots', { id, vistoriaId, itemId, estado, justificativa });
  await tocar(vistoriaId);
}

// ---------- Fotos ----------

export async function listarFotos(vistoriaId: string): Promise<Foto[]> {
  const fotos = await (await getDB()).getAllFromIndex('fotos', 'vistoriaId', vistoriaId);
  return fotos.sort((a, b) => a.ordem - b.ordem);
}

export async function adicionarFoto(
  dados: Omit<Foto, 'id' | 'createdAt' | 'ordem' | 'thumb'> & { arquivo: Blob; thumb: Blob },
): Promise<Foto> {
  const db = await getDB();
  const [buf, thumb] = await Promise.all([dados.arquivo.arrayBuffer(), dados.thumb.arrayBuffer()]);
  const agora = Date.now();
  const foto: Foto = {
    id: novoId(),
    vistoriaId: dados.vistoriaId,
    itemId: dados.itemId,
    nome: dados.nome,
    antena: dados.antena,
    ordem: agora + Math.random(),
    createdAt: agora,
    thumb,
  };
  const tx = db.transaction(['fotos', 'fotoDados', 'vistorias'], 'readwrite');
  await tx.objectStore('fotoDados').put({ id: foto.id, dados: buf });
  await tx.objectStore('fotos').put(foto);
  const v = await tx.objectStore('vistorias').get(dados.vistoriaId);
  if (v) await tx.objectStore('vistorias').put({ ...v, updatedAt: agora });
  await tx.done;
  return foto;
}

export async function atualizarFoto(foto: Foto): Promise<void> {
  await (await getDB()).put('fotos', foto);
}

export async function excluirFoto(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['fotos', 'fotoDados'], 'readwrite');
  await tx.objectStore('fotos').delete(id);
  await tx.objectStore('fotoDados').delete(id);
  await tx.done;
}

export async function obterDadosFoto(id: string): Promise<ArrayBuffer | undefined> {
  return (await (await getDB()).get('fotoDados', id))?.dados;
}

// ---------- Antenas ----------

export async function listarAntenas(vistoriaId: string): Promise<Antena[]> {
  const a = await (await getDB()).getAllFromIndex('antenas', 'vistoriaId', vistoriaId);
  return a.sort((x, y) => x.ordem - y.ordem);
}

export async function salvarAntena(a: Antena): Promise<void> {
  await (await getDB()).put('antenas', a);
  await tocar(a.vistoriaId);
}

export async function excluirAntena(id: string): Promise<void> {
  await (await getDB()).delete('antenas', id);
}
