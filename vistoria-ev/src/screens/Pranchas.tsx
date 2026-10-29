import { SlotSecao } from '../components/SlotSecao';
import { getConfig } from '../config';
import { useDadosVistoria } from '../hooks/useDadosVistoria';
import { pad } from '../lib/naming';
import { resumoItens } from '../lib/slots';
import type { PropsAba } from './Vistoria';

export function Pranchas({ v }: PropsAba) {
  const cfg = getConfig(v.tipo);
  const { slots, fotos, carregado, recarregar } = useDadosVistoria(v.id);
  if (!carregado) return <p>Carregando…</p>;
  const resumo = resumoItens(cfg, 'PR', v.campos, slots, fotos);

  return (
    <>
      <p className="pequeno claro">Fotografe as pranchas preenchidas à mão, bem enquadradas e sem sombra.</p>
      {resumo.map((r) =>
        r.slots.map((s) => (
          <SlotSecao
            key={s.key}
            v={v}
            slotKey={s.key}
            titulo={`${pad(r.item.num, 2)} · ${r.item.titulo}${r.temSub ? ` — ${s.label}` : ''}`}
            slot={s.slot}
            fotos={fotos.filter((f) => f.itemId === s.key)}
            modo="checklist"
            onAlterado={recarregar}
          />
        )),
      )}
    </>
  );
}
