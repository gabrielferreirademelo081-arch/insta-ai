import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Campos } from '../config/types';

export interface Vistoria {
  id: string;
  tipo: string;
  campos: Campos;
  createdAt: number;
  updatedAt: number;
  ultimaExportacao?: number;
}

/** NAO_TEM/OUTRO: checklist e pranchas. ENCONTRADA: patologias. Sem registro = padrão. */
export type EstadoSlot = 'NAO_TEM' | 'OUTRO' | 'ENCONTRADA';

export interface SlotChecklist {
  /** `${vistoriaId}|${itemId}` */
  id: string;
  vistoriaId: string;
  /** Chave do slot: C03:A, C33:030, P04, PR02:FRENTE... */
  itemId: string;
  estado: EstadoSlot | null;
  justificativa: string;
}

/** Metadados da foto + miniatura. O arquivo grande fica em `fotoDados` (carrega só quando precisa). */
export interface Foto {
  id: string;
  vistoriaId: string;
  itemId: string;
  nome: string;
  ordem: number;
  createdAt: number;
  /** Nº da antena (item 43). */
  antena?: string;
  thumb: ArrayBuffer;
}

export interface FotoDados {
  id: string;
  dados: ArrayBuffer;
}

export interface Antena {
  id: string;
  vistoriaId: string;
  ordem: number;
  campos: Campos;
}

interface VistoriaDB extends DBSchema {
  vistorias: { key: string; value: Vistoria };
  slots: { key: string; value: SlotChecklist; indexes: { vistoriaId: string } };
  fotos: { key: string; value: Foto; indexes: { vistoriaId: string } };
  fotoDados: { key: string; value: FotoDados };
  antenas: { key: string; value: Antena; indexes: { vistoriaId: string } };
}

export type DB = IDBPDatabase<VistoriaDB>;

let dbPromise: Promise<DB> | null = null;

export function getDB(): Promise<DB> {
  if (!dbPromise) {
    dbPromise = openDB<VistoriaDB>('vistoria-kk', 1, {
      upgrade(db) {
        db.createObjectStore('vistorias', { keyPath: 'id' });
        db.createObjectStore('slots', { keyPath: 'id' }).createIndex('vistoriaId', 'vistoriaId');
        db.createObjectStore('fotos', { keyPath: 'id' }).createIndex('vistoriaId', 'vistoriaId');
        db.createObjectStore('fotoDados', { keyPath: 'id' });
        db.createObjectStore('antenas', { keyPath: 'id' }).createIndex('vistoriaId', 'vistoriaId');
      },
    });
  }
  return dbPromise;
}
