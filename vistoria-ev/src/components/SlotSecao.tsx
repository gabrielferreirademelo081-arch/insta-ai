import { useState } from 'react';
import { salvarSlot } from '../db/repo';
import type { EstadoSlot, Foto, SlotChecklist, Vistoria } from '../db/schema';
import { useAutosave } from '../hooks/useAutosave';
import { mensagemErro } from '../lib/erros';
import { salvarArquivos } from '../lib/fotos';
import { ROTULO_STATUS, statusSlot } from '../lib/slots';
import { toast } from '../lib/toast';
import { AlertaQualidade } from './AlertaQualidade';
import { CapturaBotoes } from './CapturaBotoes';
import { FotoGrid } from './FotoGrid';

interface Props {
  v: Vistoria;
  slotKey: string;
  titulo: string;
  slot?: SlotChecklist;
  fotos: Foto[];
  /** checklist/pranchas: PENDENTE|COM FOTO|NÃO TEM|OUTRO. patologia: NÃO ENCONTRADA|ENCONTRADA. */
  modo: 'checklist' | 'patologia';
  textoLivre?: boolean;
  vinculaAntena?: boolean;
  antenaPadrao?: string;
  onAlterado: () => void;
}

export function SlotSecao(p: Props) {
  const { v, slotKey, slot, fotos, modo } = p;
  const [estado, setEstado] = useState<EstadoSlot | null>(slot?.estado ?? null);
  const [just, setJust] = useState(slot?.justificativa ?? '');
  const [ocupado, setOcupado] = useState('');
  const [comAlerta, setComAlerta] = useState<Foto | null>(null);
  const { agendar, flush } = useAutosave<{ e: EstadoSlot | null; j: string }>((x) =>
    salvarSlot(v.id, slotKey, x.e, x.j).then(p.onAlterado),
  );

  const mudarEstado = async (novo: EstadoSlot | null) => {
    flush();
    setEstado(novo);
    const j = novo ? just : '';
    if (!novo) setJust('');
    try {
      await salvarSlot(v.id, slotKey, novo, j);
      p.onAlterado();
    } catch (e) {
      toast(mensagemErro(e));
    }
  };

  const aoDigitar = (txt: string) => {
    setJust(txt);
    agendar(slotKey, { e: estado, j: txt });
  };

  const aoFotografar = async (arqs: File[]) => {
    try {
      const salvas = await salvarArquivos(v, slotKey, arqs, p.antenaPadrao, (i, t) =>
        setOcupado(t > 1 ? `Salvando ${i}/${t}…` : 'Salvando…'),
      );
      const ruim = salvas.filter((f) => f.alerta);
      setComAlerta(ruim[ruim.length - 1] ?? null);
      if (!ruim.length) toast(salvas.length > 1 ? `${salvas.length} fotos salvas` : 'Foto salva');
    } catch (e) {
      toast(mensagemErro(e));
    } finally {
      setOcupado('');
      p.onAlterado();
    }
  };

  let chip: { txt: string; cls: string };
  if (modo === 'patologia') {
    chip =
      estado !== 'ENCONTRADA'
        ? { txt: 'NÃO ENCONTRADA', cls: 'ok-neutro' }
        : !fotos.length
          ? { txt: 'FALTA FOTO', cls: 'pendente' }
          : p.textoLivre && !just.trim()
            ? { txt: 'FALTA DESCRIÇÃO', cls: 'pendente' }
            : { txt: 'ENCONTRADA', cls: 'alerta' };
  } else {
    const st = statusSlot(estado ? { ...(slot as SlotChecklist), estado, justificativa: just } : undefined, fotos.length);
    chip = {
      txt: ROTULO_STATUS[st] + (st === 'COM_FOTO' ? ` (${fotos.length})` : ''),
      cls: st === 'COM_FOTO' ? 'ok' : st === 'NAO_TEM' || st === 'OUTRO' ? 'ok-neutro' : 'pendente',
    };
  }

  const mostrarFotos = modo === 'checklist' || estado === 'ENCONTRADA' || fotos.length > 0;

  return (
    <section className="cartao slot">
      <div className="slot-topo">
        <h3>{p.titulo}</h3>
        <span className={`chip ${chip.cls}`}>{chip.txt}</span>
      </div>

      {modo === 'patologia' ? (
        <div className="segmentado">
          <button type="button" className={estado !== 'ENCONTRADA' ? 'ativo' : ''} onClick={() => mudarEstado(null)}>
            Não encontrada
          </button>
          <button
            type="button"
            className={estado === 'ENCONTRADA' ? 'ativo alerta' : ''}
            onClick={() => mudarEstado('ENCONTRADA')}
          >
            Encontrada
          </button>
        </div>
      ) : (
        <div className="segmentado">
          {(['NAO_TEM', 'OUTRO'] as const).map((e) => (
            <button
              type="button"
              key={e}
              className={estado === e ? 'ativo' : ''}
              onClick={() => mudarEstado(estado === e ? null : e)}
            >
              {e === 'NAO_TEM' ? 'Não tem' : 'Outro'}
            </button>
          ))}
        </div>
      )}

      {(modo === 'checklist' ? !!estado : estado === 'ENCONTRADA') && (
        <div className={`campo${(modo === 'checklist' || p.textoLivre) && !just.trim() ? ' faltando' : ''}`}>
          <label htmlFor={`j-${slotKey}`}>
            {modo === 'checklist' ? 'Justificativa *' : p.textoLivre ? 'Descrição *' : 'Observação'}
          </label>
          <input
            id={`j-${slotKey}`}
            value={just}
            placeholder={modo === 'checklist' ? 'ex.: concretado' : ''}
            onChange={(e) => aoDigitar(e.target.value)}
          />
        </div>
      )}

      {mostrarFotos && (
        <>
          <FotoGrid fotos={fotos} vinculaAntena={p.vinculaAntena} onAlterado={p.onAlterado} />
          {comAlerta && (
            <AlertaQualidade
              v={v}
              foto={comAlerta}
              onResolvido={(nova) => {
                setComAlerta(nova);
                p.onAlterado();
              }}
            />
          )}
          <CapturaBotoes onArquivos={aoFotografar} ocupado={!!ocupado} />
          {ocupado && <p className="pequeno">{ocupado}</p>}
        </>
      )}
    </section>
  );
}
