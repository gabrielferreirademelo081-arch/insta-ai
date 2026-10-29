import type { CampoDef, Campos, TipoConfig } from '../config/types';

/** "12,5" ou "12.5" -> 12.5; texto inválido -> null. */
export function numero(v: string): number | null {
  const t = (v ?? '').trim();
  if (!/^-?\d+([.,]\d+)?$/.test(t)) return null;
  return parseFloat(t.replace(',', '.'));
}

/** Aviso de formato/faixa de um campo, ou null se ok (vazio é ok: obrigatoriedade é tratada à parte). */
export function validarCampo(def: CampoDef, valor: string): string | null {
  const v = (valor ?? '').trim();
  if (!v) return null;
  if (def.tipo === 'numero') {
    const n = numero(v);
    if (n === null) return 'Número inválido (use só dígitos e vírgula)';
    if ((def.min !== undefined && n < def.min) || (def.max !== undefined && n > def.max))
      return `Fora da faixa esperada (${def.min ?? '…'} a ${def.max ?? '…'})`;
  }
  if (def.formato === 'cep' && !/^\d{5}-?\d{3}$/.test(v)) return 'CEP deve ter 8 dígitos';
  if (def.tipo === 'geo') {
    const m = /^(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)$/.exec(v);
    if (!m || Math.abs(+m[1]) > 90 || Math.abs(+m[2]) > 180) return 'Formato esperado: -23.550520, -46.633308';
  }
  return null;
}

export function errosRegistro(cfg: TipoConfig, campos: Campos): string[] {
  const defs = [...cfg.registro.flatMap((g) => g.campos), ...cfg.antenaExtras];
  return defs.flatMap((d) => {
    const e = validarCampo(d, campos[d.key] ?? '');
    return e ? [`${d.label}: ${e}`] : [];
  });
}

/** Avisos por campo de uma antena (inclui altura acima da EV). */
export function avisosAntena(cfg: TipoConfig, antena: Campos, registro: Campos): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of cfg.antena) {
    const e = validarCampo(d, antena[d.key] ?? '');
    if (e) out[d.key] = e;
  }
  const lim = cfg.limiteAlturaAntena;
  if (lim && !out[lim.campoAntena]) {
    const h = numero(antena[lim.campoAntena] ?? '');
    const ev = numero(registro[lim.campoRegistro] ?? '');
    if (h !== null && ev !== null && h > ev) out[lim.campoAntena] = `Acima da altura da EV (${registro[lim.campoRegistro]} m)`;
  }
  return out;
}
