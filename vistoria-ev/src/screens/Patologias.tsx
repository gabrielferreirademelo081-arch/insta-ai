import { SlotSecao } from '../components/SlotSecao';
import { getConfig } from '../config';
import { useDadosVistoria } from '../hooks/useDadosVistoria';
import { pad } from '../lib/naming';
import { itemKey } from '../lib/slots';
import type { PropsAba } from './Vistoria';

export function Patologias({ v }: PropsAba) {
  const cfg = getConfig(v.tipo);
  const { slots, fotos, carregado, recarregar } = useDadosVistoria(v.id);
  if (!carregado) return <p>Carregando…</p>;
  const encontradas = cfg.patologias.filter((p) => slots.get(itemKey('P', p.num))?.estado === 'ENCONTRADA').length;

  return (
    <>
      <p className="pequeno claro">
        Padrão: <b>não encontrada</b>. Marque “Encontrada” e fotografe (mín. 1 foto). Encontradas: <b>{encontradas}</b>
      </p>
      {cfg.patologias.map((p) => {
        const k = itemKey('P', p.num);
        return (
          <SlotSecao
            key={k}
            v={v}
            slotKey={k}
            titulo={`${pad(p.num, 2)} · ${p.titulo}`}
            slot={slots.get(k)}
            fotos={fotos.filter((f) => f.itemId === k)}
            modo="patologia"
            textoLivre={p.textoLivre}
            onAlterado={recarregar}
          />
        );
      })}
    </>
  );
}
