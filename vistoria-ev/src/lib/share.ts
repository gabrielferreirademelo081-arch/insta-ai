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
    r.onload = () => ok(String(r.result).split(',')[1] ?? '');
    r.onerror = () => erro(r.error);
    r.readAsDataURL(blob);
  });

/** Pedaço múltiplo de 3 bytes: cada parte vira base64 sem "=" no meio do arquivo. */
const PEDACO = 3 * 1024 * 1024;
const PASTA_EXPORT = 'exportacoes';

/**
 * Grava o arquivo no cache em pedaços de 3 MB. Passar um ZIP de 40 MB inteiro em base64 pela ponte
 * do Capacitor chega a ~300 MB de memória e derruba o app em celular médio.
 */
async function gravarNoCache(arq: Blob, nome: string): Promise<string> {
  // Apaga exportações anteriores (senão o cache cresce a cada exportação).
  await Filesystem.rmdir({ path: PASTA_EXPORT, directory: Directory.Cache, recursive: true }).catch(() => undefined);
  await Filesystem.mkdir({ path: PASTA_EXPORT, directory: Directory.Cache, recursive: true }).catch(() => undefined);
  const path = `${PASTA_EXPORT}/${nome}`;
  await Filesystem.writeFile({ path, data: '', directory: Directory.Cache });
  for (let i = 0; i < arq.size; i += PEDACO)
    await Filesystem.appendFile({ path, data: await paraBase64(arq.slice(i, i + PEDACO)), directory: Directory.Cache });
  return (await Filesystem.getUri({ path, directory: Directory.Cache })).uri;
}

/** No app Android a WebView não tem Web Share nem download por <a>: grava no cache e abre a folha de compartilhar. */
async function compartilharNativo(arq: File, titulo: string): Promise<boolean> {
  const uri = await gravarNoCache(arq, arq.name);
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

/** Baixa o arquivo (no app Android abre a folha de compartilhar). Retorna false se o usuário cancelou. */
export async function baixar(blob: Blob, nome: string): Promise<boolean> {
  if (nativo) return compartilharNativo(new File([blob], nome, { type: blob.type }), nome);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}

/**
 * A câmera da WebView do Capacitor grava cada foto original (3–8 MB) em
 * Android/data/<app>/files/Pictures/JPEG_*.jpg e nunca apaga. O app já guardou a versão
 * reduzida no banco, então esses originais podem ser removidos.
 */
export async function limparFotosTemporariasCamera(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  try {
    const { files } = await Filesystem.readdir({ path: 'Pictures', directory: Directory.External });
    for (const f of files)
      if (f.type === 'file' && /^JPEG_.*\.jpg$/i.test(f.name))
        await Filesystem.deleteFile({ path: `Pictures/${f.name}`, directory: Directory.External }).catch(() => undefined);
  } catch {
    // Pasta ainda não existe (nenhuma foto tirada): nada a limpar.
  }
}
