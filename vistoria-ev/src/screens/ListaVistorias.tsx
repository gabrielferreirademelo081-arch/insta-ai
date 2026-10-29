import { useEffect, useState } from 'react';
import { getConfig, TIPO_PADRAO } from '../config';
import { criarVistoria, duplicarVistoria, excluirVistoria, listarVistorias } from '../db/repo';
import type { Vistoria } from '../db/schema';
import { mensagemErro } from '../lib/erros';
import { ir } from '../lib/rota';
import { estimativa, formatarBytes, isIOS, isStandalone, pedirPersistencia } from '../lib/storage';
import { toast } from '../lib/toast';

const DIA = 24 * 3600 * 1000;

function quando(ts?: number): string {
  if (!ts) return 'nunca';
  const d = Date.now() - ts;
  if (d < 60_000) return 'agora';
  if (d < 3600_000) return `há ${Math.round(d / 60_000)} min`;
  if (d < DIA) return `há ${Math.round(d / 3600_000)} h`;
  return new Date(ts).toLocaleDateString('pt-BR');
}

export function ListaVistorias() {
  const [lista, setLista] = useState<Vistoria[] | null>(null);
  const [persistente, setPersistente] = useState<boolean | null>(null);
  const [uso, setUso] = useState<{ usado: number; quota: number } | null>(null);

  const carregar = () =>
    listarVistorias()
      .then(setLista)
      .catch((e) => toast(mensagemErro(e)));

  useEffect(() => {
    carregar();
    pedirPersistencia().then(setPersistente);
    estimativa().then(setUso);
  }, []);

  const nova = async () => {
    try {
      const v = await criarVistoria(TIPO_PADRAO);
      ir(`/v/${v.id}/registro`);
    } catch (e) {
      toast(mensagemErro(e));
    }
  };

  const iosSemInstalar = isIOS() && !isStandalone();

  return (
    <div className="tela">
      <header className="topo">
        <div>
          <h1>Vistorias</h1>
          <p className="pequeno claro">KK Projetos · {getConfig(TIPO_PADRAO).nome}</p>
        </div>
      </header>

      <main className="conteudo">
        {iosSemInstalar && (
          <div className="aviso forte">
            <b>Instale o app antes de usar em campo.</b> No iPhone, sem instalar, o sistema pode apagar os dados.
            Toque em <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b>.
          </div>
        )}
        <div className="aviso">
          📦 Os dados ficam <b>só neste aparelho</b>. Exporte o ZIP com frequência (no fim de cada site).
          {persistente === false && <> O navegador não garantiu armazenamento permanente.</>}
          {uso && uso.quota > 0 && (
            <div className="pequeno">
              Espaço usado: {formatarBytes(uso.usado)} de {formatarBytes(uso.quota)}
            </div>
          )}
        </div>

        {lista === null && <p>Carregando…</p>}
        {lista?.length === 0 && <p className="vazio">Nenhuma vistoria ainda. Toque em “Nova vistoria”.</p>}

        {lista?.map((v) => {
          const cfg = getConfig(v.tipo);
          const semExport = !v.ultimaExportacao || v.ultimaExportacao < v.updatedAt;
          return (
            <article key={v.id} className="cartao vistoria-card">
              <button type="button" className="vistoria-abrir" onClick={() => ir(`/v/${v.id}/registro`)}>
                <div className="vistoria-titulo">
                  {v.campos[cfg.campoObra] || 'Sem obra'} · {v.campos[cfg.campoIdSite] || 'sem ID'}
                </div>
                <div className="pequeno">
                  {v.tipo} · {v.campos.endereco || 'sem endereço'}
                </div>
                <div className="pequeno">
                  Alterada {quando(v.updatedAt)} ·{' '}
                  <span className={semExport ? 'texto-alerta' : ''}>exportada {quando(v.ultimaExportacao)}</span>
                </div>
              </button>
              <div className="linha-botoes">
                <button
                  type="button"
                  className="btn secundario"
                  onClick={async () => {
                    try {
                      await duplicarVistoria(v.id);
                      toast('Vistoria duplicada (registro e antenas, sem fotos)');
                      carregar();
                    } catch (e) {
                      toast(mensagemErro(e));
                    }
                  }}
                >
                  Duplicar
                </button>
                <button
                  type="button"
                  className="btn perigo"
                  onClick={async () => {
                    const nome = `${v.campos[cfg.campoObra] || 'sem obra'} / ${v.campos[cfg.campoIdSite] || 'sem ID'}`;
                    if (!confirm(`Excluir a vistoria ${nome} com todas as fotos?\n\nIsso não pode ser desfeito.`))
                      return;
                    if (semExport && !confirm('Esta vistoria tem alterações NÃO exportadas. Excluir mesmo assim?'))
                      return;
                    try {
                      await excluirVistoria(v.id);
                      carregar();
                      estimativa().then(setUso);
                    } catch (e) {
                      toast(mensagemErro(e));
                    }
                  }}
                >
                  Excluir
                </button>
              </div>
            </article>
          );
        })}
      </main>

      <footer className="rodape-acao">
        <button type="button" className="btn primario grande" onClick={nova}>
          + Nova vistoria
        </button>
      </footer>
    </div>
  );
}
