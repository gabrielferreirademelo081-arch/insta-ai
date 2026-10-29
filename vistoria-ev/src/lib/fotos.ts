import { getConfig } from '../config';
import { adicionarFoto, listarFotos } from '../db/repo';
import type { Vistoria } from '../db/schema';
import { processarFoto } from './image';
import { nomeFoto, prefixo } from './naming';
import { partesNome } from './slots';

/** Comprime e salva as fotos escolhidas, uma de cada vez (economiza memória). */
export async function salvarArquivos(
  v: Vistoria,
  slotKey: string,
  arquivos: FileList | File[],
  antena?: string,
  onProgresso?: (i: number, total: number) => void,
): Promise<number> {
  const cfg = getConfig(v.tipo);
  const lista = Array.from(arquivos);
  const existentes = (await listarFotos(v.id)).filter(
    (f) => f.itemId === slotKey && (f.antena ?? '') === (antena ?? ''),
  ).length;
  let salvas = 0;
  for (let i = 0; i < lista.length; i++) {
    onProgresso?.(i + 1, lista.length);
    const { arquivo, thumb } = await processarFoto(lista[i]);
    const { codigo, desc } = partesNome(cfg, v.campos, slotKey, antena);
    await adicionarFoto({
      vistoriaId: v.id,
      itemId: slotKey,
      antena: antena?.trim() || undefined,
      nome: nomeFoto(prefixo(cfg, v.campos), codigo, desc, existentes + i + 1),
      arquivo,
      thumb,
    });
    salvas++;
  }
  return salvas;
}

const cacheThumb = new Map<string, string>();

/** URL da miniatura (cacheada; liberada ao excluir a foto). */
export function urlThumb(f: { id: string; thumb: ArrayBuffer }): string {
  let u = cacheThumb.get(f.id);
  if (!u) {
    u = URL.createObjectURL(new Blob([f.thumb], { type: 'image/jpeg' }));
    cacheThumb.set(f.id, u);
  }
  return u;
}

export function liberarThumb(id: string) {
  const u = cacheThumb.get(id);
  if (u) URL.revokeObjectURL(u);
  cacheThumb.delete(id);
}
