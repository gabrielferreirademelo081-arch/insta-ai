import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const nativo = Capacitor.isNativePlatform();

export function podeCompartilharArquivo(arq: File): boolean {
  if (nativo) return true;
  try {
    return !!navigator.canShare?.({ files: [arq] });
  } catch {
    return false;
  }
}

const paraBase64 = (blob: Blob) =>
  new Promise<string>((ok, erro) => {
    const r = new FileReader();
    r.onload = () => ok((r.result as string).split(',')[1]);
    r.onerror = () => erro(r.error);
    r.readAsDataURL(blob);
  });

/** No app Android a WebView não tem Web Share nem download por <a>: grava no cache e abre a folha de compartilhar. */
async function compartilharNativo(arq: File, titulo: string): Promise<boolean> {
  const { uri } = await Filesystem.writeFile({ path: arq.name, data: await paraBase64(arq), directory: Directory.Cache });
  try {
    await Share.share({ title: titulo, files: [uri] });
    return true;
  } catch (e) {
    if (/cancel/i.test(String((e as Error)?.message))) return false;
    throw e;
  }
}

/** Retorna false se o usuário cancelou. */
export async function compartilhar(arq: File, titulo: string): Promise<boolean> {
  if (nativo) return compartilharNativo(arq, titulo);
  try {
    await navigator.share({ files: [arq], title: titulo });
    return true;
  } catch (e) {
    if ((e as { name?: string })?.name === 'AbortError') return false;
    throw e;
  }
}

export function baixar(blob: Blob, nome: string) {
  if (nativo) {
    void compartilharNativo(new File([blob], nome, { type: blob.type }), nome);
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
