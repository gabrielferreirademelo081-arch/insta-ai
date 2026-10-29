export function podeCompartilharArquivo(arq: File): boolean {
  try {
    return !!navigator.canShare?.({ files: [arq] });
  } catch {
    return false;
  }
}

/** Web Share API. Retorna false se o usuário cancelou. */
export async function compartilhar(arq: File, titulo: string): Promise<boolean> {
  try {
    await navigator.share({ files: [arq], title: titulo });
    return true;
  } catch (e) {
    if ((e as { name?: string })?.name === 'AbortError') return false;
    throw e;
  }
}

export function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
