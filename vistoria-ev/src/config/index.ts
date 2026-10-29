import { evConfig } from './ev';
import type { TipoConfig } from './types';

/** Tipos de vistoria disponíveis. Para FD/rooftop: criar src/config/fd.ts e registrar aqui. */
export const CONFIGS: Record<string, TipoConfig> = {
  EV: evConfig,
};

export const TIPO_PADRAO = 'EV';

export function getConfig(tipo: string): TipoConfig {
  return CONFIGS[tipo] ?? CONFIGS[TIPO_PADRAO];
}

export type { TipoConfig } from './types';
