export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Pede ao navegador para não apagar os dados do app. */
export async function pedirPersistencia(): Promise<boolean | null> {
  if (!navigator.storage?.persist) return null;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

export async function estimativa(): Promise<{ usado: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null;
  try {
    const e = await navigator.storage.estimate();
    return { usado: e.usage ?? 0, quota: e.quota ?? 0 };
  } catch {
    return null;
  }
}

export function formatarBytes(b: number): string {
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

const DIA = 24 * 3600 * 1000;

/** Alterações não exportadas há mais de 24 h (conta a partir da última exportação ou da criação). */
export function exportacaoAtrasada(v: { createdAt: number; updatedAt: number; ultimaExportacao?: number }): boolean {
  const base = v.ultimaExportacao ?? v.createdAt;
  return v.updatedAt > (v.ultimaExportacao ?? 0) && Date.now() - base > DIA;
}
