import { useCallback, useEffect, useRef } from 'react';
import { mensagemErro } from '../lib/erros';
import { toast } from '../lib/toast';

/**
 * Salva automaticamente, com atraso curto depois da última alteração.
 * Também salva ao sair da tela, ao trocar de app e ao fechar (pagehide).
 * Chaveado por id: várias linhas (ex.: antenas) podem estar pendentes ao mesmo tempo.
 */
export function useAutosave<T>(salvar: (v: T) => Promise<void>, atraso = 500) {
  const pendentes = useRef(new Map<string, T>());
  const timer = useRef<number | undefined>(undefined);
  const salvarRef = useRef(salvar);
  salvarRef.current = salvar;

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    const itens = [...pendentes.current.values()];
    pendentes.current.clear();
    for (const v of itens) salvarRef.current(v).catch((e) => toast(mensagemErro(e)));
  }, []);

  const agendar = useCallback(
    (id: string, v: T) => {
      pendentes.current.set(id, v);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, atraso);
    },
    [flush, atraso],
  );

  useEffect(() => {
    const aoOcultar = () => document.visibilityState === 'hidden' && flush();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', aoOcultar);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', aoOcultar);
      flush();
    };
  }, [flush]);

  return { agendar, flush };
}
