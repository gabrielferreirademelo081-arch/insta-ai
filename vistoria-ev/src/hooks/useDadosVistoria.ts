import { useCallback, useEffect, useState } from 'react';
import { listarFotos, listarSlots } from '../db/repo';
import type { Foto, SlotChecklist } from '../db/schema';
import { mensagemErro } from '../lib/erros';
import { mapaSlots } from '../lib/slots';
import { toast } from '../lib/toast';

/** Estados do checklist + fotos de uma vistoria, com recarga. */
export function useDadosVistoria(vistoriaId: string) {
  const [slots, setSlots] = useState<Map<string, SlotChecklist>>(new Map());
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [carregado, setCarregado] = useState(false);

  const recarregar = useCallback(async () => {
    try {
      const [s, f] = await Promise.all([listarSlots(vistoriaId), listarFotos(vistoriaId)]);
      setSlots(mapaSlots(s));
      setFotos(f);
      setCarregado(true);
    } catch (e) {
      toast(mensagemErro(e));
    }
  }, [vistoriaId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { slots, fotos, carregado, recarregar };
}
