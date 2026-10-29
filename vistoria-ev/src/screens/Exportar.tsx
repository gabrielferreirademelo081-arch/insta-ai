import { useEffect, useState } from 'react';
import { getConfig } from '../config';
import { calcularPendencias, carregarDados, gerarZip, type Pendencias } from '../lib/export';
import { mensagemErro } from '../lib/erros';
import { resumoItens, mapaSlots } from '../lib/slots';
import { baixar, compartilhar, podeCompartilharArquivo } from '../lib/share';
import { estimativa, formatarBytes } from '../lib/storage';
import { toast } from '../lib/toast';
import type { PropsAba } from './Vistoria';

interface Resultado {
  arquivo: File;
}

export function Exportar({ v }: PropsAba) {
  const cfg = getConfig(v.tipo);
  const [pend, setPend] = useState<Pendencias | null>(null);
  const [info, setInfo] = useState<{ fotos: number; itens: string; antenas: number } | null>(null);
  const [progresso, setProgresso] = useState('');
  const [res, setRes] = useState<Resultado | null>(null);
  const [espaco, setEspaco] = useState('');

  useEffect(() => {
    carregarDados(v)
      .then((d) => {
        setPend(calcularPendencias(d));
        const r = resumoItens(d.cfg, 'C', v.campos, mapaSlots(d.slots), d.fotos);
        setInfo({
          fotos: d.fotos.length,
          itens: `${r.filter((x) => x.completo).length}/${r.length}`,
          antenas: d.antenas.length,
        });
      })
      .catch((e) => toast(mensagemErro(e)));
    estimativa().then((e) => e && e.quota && setEspaco(`${formatarBytes(e.usado)} de ${formatarBytes(e.quota)}`));
  }, [v]);

  const bloqueado = cfg.bloquearExportComPendentes && !!pend?.total;

  const gerar = async () => {
    if (pend?.total && !confirm(`Há ${pend.total} pendência(s). Exportar mesmo assim?`)) return;
    setRes(null);
    try {
      const { blob, nome } = await gerarZip(v, setProgresso);
      setRes({ arquivo: new File([blob], nome, { type: 'application/zip' }) });
    } catch (e) {
      toast(mensagemErro(e));
    } finally {
      setProgresso('');
    }
  };

  const grupos: [string, string[]][] = pend
    ? [
        ['Registro', pend.registro],
        ['Checklist de fotos', pend.checklist],
        ['Patologias', pend.patologias],
        ['Pranchas', pend.pranchas],
        ['Antenas', pend.antenas],
        ['Valores a conferir', pend.valores],
      ]
    : [];

  return (
    <>
      {info && (
        <section className="cartao resumo-export">
          <div>
            <b>{info.itens}</b>
            <span>itens</span>
          </div>
          <div>
            <b>{info.fotos}</b>
            <span>fotos</span>
          </div>
          <div>
            <b>{info.antenas}</b>
            <span>antenas</span>
          </div>
        </section>
      )}

      {pend && pend.total > 0 && (
        <section className="cartao">
          <h2 className="texto-alerta">{pend.total} pendência(s)</h2>
          {bloqueado && <p>A exportação está bloqueada até resolver as pendências.</p>}
          {grupos
            .filter(([, l]) => l.length)
            .map(([t, l]) => (
              <details key={t} open={l.length <= 8}>
                <summary>
                  {t} ({l.length})
                </summary>
                <ul className="lista-pendencias">
                  {l.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </details>
            ))}
        </section>
      )}
      {pend && pend.total === 0 && <div className="aviso ok">Nenhuma pendência. ✔</div>}

      <button type="button" className="btn primario bloco grande" disabled={!!progresso || bloqueado || !pend} onClick={gerar}>
        {progresso || '📦 Gerar ZIP'}
      </button>

      {res && (
        <section className="cartao">
          <p>
            <b>{res.arquivo.name}</b> · {formatarBytes(res.arquivo.size)}
          </p>
          <div className="linha-botoes">
            {podeCompartilharArquivo(res.arquivo) && (
              <button
                type="button"
                className="btn primario"
                onClick={async () => {
                  try {
                    await compartilhar(res.arquivo, res.arquivo.name);
                  } catch (e) {
                    toast(`${mensagemErro(e)} — use “Baixar”.`);
                  }
                }}
              >
                Compartilhar
              </button>
            )}
            <button type="button" className="btn secundario" onClick={() => baixar(res.arquivo, res.arquivo.name)}>
              Baixar
            </button>
          </div>
          <p className="pequeno claro">Envie para o Drive/WhatsApp/e-mail e confira se chegou antes de excluir a vistoria.</p>
        </section>
      )}

      <p className="pequeno claro">
        O ZIP contém as pastas {cfg.pastas.map((p) => p.nome).join(', ')}, registro.txt, registro.json e antenas.csv.
        {espaco && ` Espaço usado no aparelho: ${espaco}.`}
      </p>
    </>
  );
}
