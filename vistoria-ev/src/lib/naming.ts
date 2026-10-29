import type { Campos, TipoConfig } from '../config/types';

export const pad = (n: number, w: number) => String(n).padStart(w, '0');

/** "126/843 São João" -> "126-843-SAO-JOAO" (seguro para nome de arquivo). */
export function slug(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** {OBRA}_{ID-SITE} */
export function prefixo(cfg: TipoConfig, campos: Campos): string {
  return `${slug(campos[cfg.campoObra]) || 'SEM-OBRA'}_${slug(campos[cfg.campoIdSite]) || 'SEM-ID'}`;
}

/** {OBRA}_{ID-SITE}_{ITEM}_{DESCRICAO}_{SEQ:3d}.jpg */
export function nomeFoto(pref: string, codigo: string, desc: string, seq: number): string {
  return `${pref}_${codigo}_${desc}_${pad(seq, 3)}.jpg`;
}

/** "7" -> "07"; "A3" -> "A3". */
export function rotuloAntena(n: string): string {
  const t = (n || '').trim();
  return /^\d+$/.test(t) ? pad(Number(t), 2) : slug(t);
}

/** Compara nº de antena ignorando zeros à esquerda e caixa. */
export const mesmaAntena = (a?: string, b?: string) => !!a && !!b && rotuloAntena(a) === rotuloAntena(b);
