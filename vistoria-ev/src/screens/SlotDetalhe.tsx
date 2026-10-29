import { useEffect, useState } from 'react';
import { SlotSecao } from '../components/SlotSecao';
import { getConfig } from '../config';
import { listarAntenas } from '../db/repo';
import { useDadosVistoria } from '../hooks/useDadosVistoria';
import { pad } from '../lib/naming';
import { ir } from '../lib/rota';
import { parseItemKey, resumoItens } from '../lib/slots';
import type { PropsAba } from './Vistoria';

export function SlotDetalhe({ v, ik }: PropsAba & { ik: string }) {
  const cfg = getConfig(v.tipo);
  const { slots, fotos, carregado, recarregar } = useDadosVistoria(v.id);
  const [antenaAtual, setAntenaAtual] = useState('');
  const [numerosAntenas, setNumerosAntenas] = useState<string[]>([]);
  const p = parseItemKey(ik);
  const secao = p?.secao === 'PR' ? 'PR' : 'C';
  const resumo = resumoItens(cfg, secao, v.campos, slots, fotos);
  const idx = resumo.findIndex((r) => r.ik === ik);
  const r = resumo[idx];

  useEffect(() => {
    if (r?.item.vinculaAntena)
      listarAntenas(v.id).then((a) => setNumerosAntenas(a.map((x) => x.campos.numero).filter(Boolean)));
  }, [v.id, r?.item.vinculaAntena]);

  if (!r) return <p>Item não encontrado.</p>;
  if (!carregado) return <p>Carregando…</p>;

  const anterior = resumo[idx - 1];
  const proximo = resumo[idx + 1];
  // Próximo item incompleto depois deste (volta ao início da lista se preciso).
  const proximoPendente = [...resumo.slice(idx + 1), ...resumo.slice(0, idx)].find((x) => !x.completo);

  return (
    <>
      <h2 className="titulo-item">
        {pad(r.item.num, 2)} · {r.item.titulo}
      </h2>
      {r.item.lembrete && <div className="aviso forte">⚠ {r.item.lembrete}</div>}
      {r.temSub && (
        <p className="pequeno claro">
          {r.resolvidos}/{r.slots.length} fotos resolvidas
        </p>
      )}

      {r.item.vinculaAntena && (
        <section className="cartao">
          <div className="campo">
            <label htmlFor="ant-atual">Nº da antena para as próximas fotos</label>
            <input
              id="ant-atual"
              inputMode="numeric"
              value={antenaAtual}
              placeholder="ex.: 7 (deixe vazio para foto geral)"
              onChange={(e) => setAntenaAtual(e.target.value)}
            />
          </div>
          {numerosAntenas.length > 0 && (
            <div className="chips-escolha">
              {numerosAntenas.map((n) => (
                <button
                  type="button"
                  key={n}
                  className={antenaAtual === n ? 'ativo' : ''}
                  onClick={() => setAntenaAtual(antenaAtual === n ? '' : n)}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
          <p className="pequeno claro">Use o mesmo número da tabela de antenas. Dá para mudar tocando na foto.</p>
        </section>
      )}

      {r.slots.map((s) => (
        <SlotSecao
          key={s.key}
          v={v}
          slotKey={s.key}
          titulo={r.temSub ? s.label : 'Fotos'}
          slot={s.slot}
          fotos={fotos.filter((f) => f.itemId === s.key)}
          modo="checklist"
          vinculaAntena={r.item.vinculaAntena}
          antenaPadrao={r.item.vinculaAntena ? antenaAtual : undefined}
          onAlterado={recarregar}
        />
      ))}

      {secao === 'C' && proximoPendente && (
        <button
          type="button"
          className="btn primario bloco grande"
          onClick={() => ir(`/v/${v.id}/item/${proximoPendente.ik}`)}
        >
          Próximo pendente: {pad(proximoPendente.item.num, 2)} →
        </button>
      )}
      {secao === 'C' && (
        <div className="linha-botoes navegacao-itens">
          <button
            type="button"
            className="btn secundario"
            disabled={!anterior}
            onClick={() => anterior && ir(`/v/${v.id}/item/${anterior.ik}`)}
          >
            ← {anterior ? pad(anterior.item.num, 2) : ''}
          </button>
          <button type="button" className="btn secundario" onClick={() => ir(`/v/${v.id}/fotos`)}>
            Lista
          </button>
          <button
            type="button"
            className="btn secundario"
            disabled={!proximo}
            onClick={() => proximo && ir(`/v/${v.id}/item/${proximo.ik}`)}
          >
            {proximo ? pad(proximo.item.num, 2) : ''} →
          </button>
        </div>
      )}
    </>
  );
}
