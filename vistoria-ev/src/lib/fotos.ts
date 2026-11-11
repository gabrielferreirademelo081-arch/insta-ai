import { getConfig } from '../config';
import { adicionarFoto, listarFotos } from '../db/repo';
import type { Foto, Vistoria } from '../db/schema';
import { copiarParaGaleria, galeriaDisponivel } from './galeria';
import { posicaoRapida } from './geo';
import { toast } from './toast';
import { processarFoto } from './image';
import { nomeFoto, prefixo, rotuloAntena } from './naming';
import { partesNome, tituloSlot } from './slots';

export function formatarDataHora(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Comprime, carimba e salva as fotos escolhidas, uma de cada vez (economiza memória). */
export async function salvarArquivos(
  v: Vistoria,
  slotKey: string,
  arquivos: FileList | File[],
  antena?: string,
  onProgresso?: (i: number, total: number) => void,
): Promise<Foto[]> {
  const cfg = getConfig(v.tipo);
  const lista = Array.from(arquivos);
  const gpsPromessa = posicaoRapida(); // em paralelo com o processamento
  const existentes = (await listarFotos(v.id)).filter(
    (f) => f.itemId === slotKey && (f.antena ?? '') === (antena ?? ''),
  ).length;
  const carimbar = !!cfg.campoCarimbo && v.campos[cfg.campoCarimbo] !== 'Não';
  const naGaleria = galeriaDisponivel() && !!cfg.campoGaleria && v.campos[cfg.campoGaleria] !== 'Não';
  const salvas: Foto[] = [];
  for (let i = 0; i < lista.length; i++) {
    onProgresso?.(i + 1, lista.length);
    // Foto da câmera: lastModified = agora. Da galeria: data do arquivo no aparelho.
    const capturadaEm = lista[i].lastModified || Date.now();
    const gps = await gpsPromessa;
    const carimbo = carimbar
      ? [
          `${v.campos[cfg.campoObra] || 'SEM OBRA'} · ${v.campos[cfg.campoIdSite] || 'SEM ID'}`,
          tituloSlot(cfg, v.campos, slotKey) + (antena?.trim() ? ` · Antena ${rotuloAntena(antena)}` : ''),
          `${formatarDataHora(capturadaEm)}${gps ? ` · ${gps}` : ''}`,
        ]
      : undefined;
    const { arquivo, thumb, alerta } = await processarFoto(lista[i], { carimbo, limites: cfg.qualidadeFoto });
    const { codigo, desc } = partesNome(cfg, v.campos, slotKey, antena);
    const foto = await adicionarFoto({
      vistoriaId: v.id,
      itemId: slotKey,
      antena: antena?.trim() || undefined,
      nome: nomeFoto(prefixo(cfg, v.campos), codigo, desc, existentes + i + 1),
      capturadaEm,
      gps,
      alerta,
      arquivo,
      thumb,
    });
    salvas.push(foto);
    // Cópia de segurança na galeria: falha aqui não perde a foto (ela já está salva no app).
    if (naGaleria)
      await copiarParaGaleria(arquivo, foto.nome, prefixo(cfg, v.campos)).catch((e) =>
        avisarFalhaGaleria(String((e as Error)?.message ?? e)),
      );
  }
  return salvas;
}

let ultimoAvisoGaleria = 0;
/** Avisa no máximo uma vez por minuto, para não encher a tela durante uma sequência de fotos. */
function avisarFalhaGaleria(msg: string) {
  if (Date.now() - ultimoAvisoGaleria < 60_000) return;
  ultimoAvisoGaleria = Date.now();
  toast(`Foto salva no app, mas não na galeria (${msg}).`);
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
