import { useRef, useState } from 'react';
import { getConfig } from '../config';
import { useDadosVistoria } from '../hooks/useDadosVistoria';
import { mensagemErro } from '../lib/erros';
import { salvarArquivos } from '../lib/fotos';
import { pad } from '../lib/naming';
import { ir } from '../lib/rota';
import { resumoItens, ROTULO_STATUS, type ResumoItem } from '../lib/slots';
import { toast } from '../lib/toast';
import type { PropsAba } from './Vistoria';

function chipItem(r: ResumoItem): { txt: string; cls: string } {
  if (r.temSub) return { txt: `${r.resolvidos}/${r.slots.length}`, cls: r.completo ? 'ok' : r.resolvidos ? 'parcial' : 'pendente' };
  const s = r.slots[0];
  if (s.status === 'COM_FOTO') return { txt: `${s.nFotos} 📷`, cls: 'ok' };
  if (s.status === 'NAO_TEM' || s.status === 'OUTRO') return { txt: ROTULO_STATUS[s.status], cls: 'ok-neutro' };
  return { txt: s.status === 'SEM_JUSTIFICATIVA' ? 'JUSTIFICAR' : 'PENDENTE', cls: 'pendente' };
}

/** Itens que abrem a tela de detalhe em vez de ir direto para a câmera. */
const precisaDetalhe = (r: ResumoItem) => r.temSub || !!r.item.lembrete || !!r.item.vinculaAntena;

export function Checklist({ v }: PropsAba) {
  const cfg = getConfig(v.tipo);
  const { slots, fotos, carregado, recarregar } = useDadosVistoria(v.id);
  const [soPendentes, setSoPendentes] = useState(false);
  const [salvando, setSalvando] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const alvo = useRef<ResumoItem | null>(null);

  const resumo = resumoItens(cfg, 'C', v.campos, slots, fotos);
  const feitos = resumo.filter((r) => r.completo).length;
  const visiveis = soPendentes ? resumo.filter((r) => !r.completo) : resumo;

  const tocar = (r: ResumoItem) => {
    if (precisaDetalhe(r)) return ir(`/v/${v.id}/item/${r.ik}`);
    alvo.current = r;
    input.current?.click();
  };

  const aoEscolher = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arqs = Array.from(e.target.files ?? []);
    e.target.value = '';
    const r = alvo.current;
    if (!arqs.length || !r) return;
    try {
      setSalvando(`Salvando foto do item ${pad(r.item.num, 2)}…`);
      await salvarArquivos(v, r.slots[0].key, arqs);
      toast(`Foto salva: ${pad(r.item.num, 2)} ${r.item.titulo}`);
    } catch (err) {
      toast(mensagemErro(err));
    } finally {
      setSalvando('');
      recarregar();
    }
  };

  return (
    <>
      <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={aoEscolher} />
      <div className="progresso-topo">
        <div className="progresso-texto">
          <b>
            {feitos}/{resumo.length}
          </b>{' '}
          itens completos
        </div>
        <div className="barra">
          <div style={{ width: `${(feitos / resumo.length) * 100}%` }} />
        </div>
        <label className="check">
          <input type="checkbox" checked={soPendentes} onChange={(e) => setSoPendentes(e.target.checked)} /> Só
          pendentes
        </label>
      </div>
      {salvando && <div className="aviso">{salvando}</div>}
      <p className="pequeno claro">Toque no item para fotografar. “›” abre detalhes (várias fotos, não tem, outro).</p>
      {!carregado && <p>Carregando…</p>}
      <ul className="lista-itens">
        {visiveis.map((r) => {
          const chip = chipItem(r);
          return (
            <li key={r.ik} className={`item-linha ${chip.cls}`}>
              <button type="button" className="item-principal" onClick={() => tocar(r)}>
                <span className="item-num">{pad(r.item.num, 2)}</span>
                <span className="item-titulo">
                  {r.item.titulo}
                  {r.item.lembrete && <span className="item-lembrete">⚠ {r.item.lembrete}</span>}
                </span>
                <span className={`chip ${chip.cls}`}>{chip.txt}</span>
              </button>
              <button
                type="button"
                className="item-detalhe"
                aria-label="Detalhes"
                onClick={() => ir(`/v/${v.id}/item/${r.ik}`)}
              >
                ›
              </button>
            </li>
          );
        })}
      </ul>
      {soPendentes && visiveis.length === 0 && <p className="vazio">Tudo completo 🎉</p>}
    </>
  );
}
