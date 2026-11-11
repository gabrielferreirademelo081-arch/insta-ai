import JSZip from 'jszip';
import { getConfig } from '../config';
import type { Campos } from '../config/types';
import {
  adicionarFoto,
  excluirVistoria,
  gravarVistoriaImportada,
  novoId,
  obterVistoria,
} from '../db/repo';
import type { Antena, EstadoSlot, SlotChecklist, Vistoria } from '../db/schema';
import { getDB } from '../db/schema';
import { gerarThumb } from './image';

/** Formato do registro.json gerado em export.ts (só o que a importação usa). */
interface FotoJson {
  arquivo: string;
  antena?: string | null;
  capturadaEm?: string | null;
  gps?: string | null;
  alertaQualidade?: 'escura' | 'tremida' | null;
}
interface SlotJson {
  slot: string;
  estado: string;
  estadoSalvo?: EstadoSlot | null;
  justificativa?: string;
  fotos: (FotoJson | string)[];
}
interface PatologiaJson {
  item: number;
  estado: string;
  descricao?: string;
  fotos: (FotoJson | string)[];
}
interface RegistroJson {
  app: string;
  formato: number;
  vistoria: { id: string; tipo: string; createdAt: string; campos: Campos };
  checklist: SlotJson[];
  patologias: PatologiaJson[];
  pranchas: SlotJson[];
  antenas: Campos[];
}

export interface Previa {
  json: RegistroJson;
  zip: JSZip;
  raiz: string;
  nFotos: number;
  /** Já existe uma vistoria com o mesmo id neste aparelho. */
  jaExiste: boolean;
  titulo: string;
}

/** Lê o ZIP e confere se é um backup deste app, sem gravar nada ainda. */
export async function lerBackup(arquivo: File): Promise<Previa> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(arquivo);
  } catch {
    throw new Error('Arquivo não é um ZIP válido.');
  }
  const entrada = Object.values(zip.files).find((f) => !f.dir && /(^|\/)registro\.json$/.test(f.name));
  if (!entrada) throw new Error('ZIP sem registro.json. Use um ZIP exportado por este app.');
  let json: RegistroJson;
  try {
    json = JSON.parse(await entrada.async('string'));
  } catch {
    throw new Error('registro.json corrompido.');
  }
  if (json.app !== 'vistoria-ev' || !json.vistoria?.campos)
    throw new Error('Este ZIP não foi gerado pelo app Vistoria EV.');
  if (json.formato > 2) throw new Error('Backup de uma versão mais nova do app. Atualize o app e tente de novo.');

  const raiz = entrada.name.replace(/registro\.json$/, '');
  const cfg = getConfig(json.vistoria.tipo);
  const todas = [...json.checklist, ...json.pranchas, ...json.patologias].flatMap((x) => x.fotos);
  return {
    json,
    zip,
    raiz,
    nFotos: todas.length,
    jaExiste: !!(await obterVistoria(json.vistoria.id)),
    titulo: `${json.vistoria.campos[cfg.campoObra] || 'Sem obra'} · ${json.vistoria.campos[cfg.campoIdSite] || 'sem ID'}`,
  };
}

const caminhoFoto = (f: FotoJson | string) => (typeof f === 'string' ? f : f.arquivo);

/**
 * Grava o backup como vistoria. Mantém o id original quando ele não existe no aparelho
 * (restauração); senão cria uma cópia com id novo. Se algo falhar no meio, desfaz tudo.
 */
export async function importarBackup(
  p: Previa,
  onProgresso?: (msg: string) => void,
): Promise<{ vistoria: Vistoria; fotosFaltando: number }> {
  const { json, zip, raiz } = p;
  const id = p.jaExiste ? novoId() : json.vistoria.id;
  const agora = Date.now();
  const criada = Date.parse(json.vistoria.createdAt);
  const v: Vistoria = {
    id,
    tipo: json.vistoria.tipo || 'EV',
    campos: { ...json.vistoria.campos },
    createdAt: isNaN(criada) ? agora : criada,
    updatedAt: agora,
    ultimaExportacao: agora, // o conteúdo já existe fora do aparelho (é o próprio ZIP)
  };

  const slots: SlotChecklist[] = [];
  const addSlot = (itemId: string, estado: EstadoSlot | null, justificativa: string) => {
    if (estado || justificativa) slots.push({ id: `${id}|${itemId}`, vistoriaId: id, itemId, estado, justificativa });
  };
  for (const s of [...json.checklist, ...json.pranchas]) {
    // formato 1 não tinha estadoSalvo: deduz pelo status.
    const estado =
      s.estadoSalvo !== undefined
        ? s.estadoSalvo
        : s.estado === 'NAO_TEM' || s.estado === 'SEM_JUSTIFICATIVA' // sem justificativa: o mais comum é "não tem"
          ? 'NAO_TEM'
          : s.estado === 'OUTRO'
            ? 'OUTRO'
            : null;
    addSlot(s.slot, estado, s.justificativa ?? '');
  }
  const chavePat = (n: number) => `P${String(n).padStart(2, '0')}`;
  for (const pt of json.patologias)
    addSlot(chavePat(pt.item), pt.estado === 'ENCONTRADA' ? 'ENCONTRADA' : null, pt.descricao ?? '');

  const antenas: Antena[] = (json.antenas ?? []).map((campos, ordem) => ({ id: novoId(), vistoriaId: id, ordem, campos }));

  const fotos: { slot: string; f: FotoJson | string }[] = [
    ...[...json.checklist, ...json.pranchas].flatMap((s) => s.fotos.map((f) => ({ slot: s.slot, f }))),
    ...json.patologias.flatMap((pt) => pt.fotos.map((f) => ({ slot: chavePat(pt.item), f }))),
  ];

  await gravarVistoriaImportada(v, slots, antenas);
  let faltando = 0;
  const base = Date.now();
  try {
    for (let i = 0; i < fotos.length; i++) {
      onProgresso?.(`Importando fotos ${i + 1}/${fotos.length}`);
      const { slot, f } = fotos[i];
      const caminho = caminhoFoto(f);
      const entrada = zip.file(raiz + caminho);
      if (!entrada) {
        faltando++;
        continue;
      }
      const arquivo = new Blob([await entrada.async('arraybuffer')], { type: 'image/jpeg' });
      const meta: Partial<FotoJson> = typeof f === 'string' ? {} : f;
      const em = meta.capturadaEm ? Date.parse(meta.capturadaEm) : NaN;
      await adicionarFoto({
        vistoriaId: id,
        itemId: slot,
        nome: caminho.split('/').pop() ?? caminho,
        antena: meta.antena ?? undefined,
        capturadaEm: isNaN(em) ? undefined : em,
        gps: meta.gps ?? undefined,
        alerta: meta.alertaQualidade ?? undefined,
        ordem: base + i, // mantém a sequência original das fotos
        arquivo,
        thumb: await gerarThumb(arquivo),
      });
    }
    // adicionarFoto atualiza updatedAt; marca de novo como "já exportada".
    const db = await getDB();
    const atual = await db.get('vistorias', id);
    if (atual) await db.put('vistorias', { ...atual, ultimaExportacao: atual.updatedAt });
  } catch (e) {
    await excluirVistoria(id).catch(() => undefined);
    throw e;
  }
  return { vistoria: v, fotosFaltando: faltando };
}
