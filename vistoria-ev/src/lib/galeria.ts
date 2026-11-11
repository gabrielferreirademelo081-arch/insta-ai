import { Capacitor, registerPlugin } from '@capacitor/core';

/** Plugin nativo próprio (android/app/src/main/java/br/com/kk/vistoriaev/GaleriaPlugin.java). */
interface GaleriaPlugin {
  salvarFoto(o: { base64: string; nome: string; pasta: string }): Promise<{ uri: string }>;
}
const Galeria = registerPlugin<GaleriaPlugin>('Galeria');

/** Só o app Android salva na galeria. No navegador (iPhone incluso) o sistema não permite. */
export const galeriaDisponivel = () => Capacitor.getPlatform() === 'android';

function base64(blob: Blob): Promise<string> {
  return new Promise((ok, erro) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(',')[1] ?? '');
    r.onerror = () => erro(r.error);
    r.readAsDataURL(blob);
  });
}

/** Grava uma cópia em Imagens/Vistoria EV/<subpasta>/<nome>. */
export async function copiarParaGaleria(foto: Blob, nome: string, subpasta: string): Promise<void> {
  await Galeria.salvarFoto({ base64: await base64(foto), nome, pasta: `Vistoria EV/${subpasta}` });
}
