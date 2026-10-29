export function ehArmazenamentoCheio(e: unknown): boolean {
  const n = (e as { name?: string })?.name ?? '';
  const m = String((e as { message?: string })?.message ?? '');
  return n === 'QuotaExceededError' || /quota/i.test(m);
}

export function mensagemErro(e: unknown): string {
  if (ehArmazenamentoCheio(e))
    return 'Armazenamento cheio. Exporte as vistorias concluídas e exclua as antigas para liberar espaço.';
  const m = (e as { message?: string })?.message;
  return m ? `Erro: ${m}` : 'Erro inesperado.';
}
