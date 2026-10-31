import { useEffect, useRef, useState } from 'react';
import { getConfig, TIPO_PADRAO } from '../config';
import { criarVistoria, duplicarVistoria, excluirVistoria, listarVistorias } from '../db/repo';
import type { Vistoria } from '../db/schema';
import { mensagemErro } from '../lib/erros';
import { importarBackup, lerBackup, type Previa } from '../lib/importar';
import { ir } from '../lib/rota';
import { estimativa, exportacaoAtrasada, formatarBytes, isIOS, isStandalone, pedirPersistencia } from '../lib/storage';
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
  const inputZip = useRef<HTMLInputElement>(null);
  const [previaImport, setPreviaImport] = useState<Previa | null>(null);
  const [importando, setImportando] = useState('');

  const aoEscolherZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arq = e.target.files?.[0];
    e.target.value = '';
    if (!arq) return;
    try {
      setImportando('Lendo ZIP…');
      setPreviaImport(await lerBackup(arq));
    } catch (err) {
      toast(mensagemErro(err));
    } finally {
      setImportando('');
    }
  };

  const confirmarImport = async () => {
    const p = previaImport;
    if (!p) return;
    setPreviaImport(null);
    try {
      const { vistoria, fotosFaltando } = await importarBackup(p, setImportando);
      toast(
        fotosFaltando
          ? `Importada, mas ${fotosFaltando} foto(s) não estavam no ZIP`
          : `Vistoria importada com ${p.nFotos} foto(s)`,
      );
      ir(`/v/${vistoria.id}/registro`);
    } catch (err) {
      toast(mensagemErro(err));
      carregar();
    } finally {
      setImportando('');
    }
  };

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

  const previa = import.meta.env.MODE === 'artifact';
  const iosSemInstalar = !previa && isIOS() && !isStandalone();
  const atrasadas = (lista ?? []).filter(exportacaoAtrasada).length;

  return (
    <div className="tela">
      <header className="topo">
        <div>
          <h1>Vistorias</h1>
          <p className="pequeno claro">KK Projetos · {getConfig(TIPO_PADRAO).nome}</p>
        </div>
      </header>

      <main className="conteudo">
        {previa && (
          <div className="aviso forte">
            <b>Prévia para ver as telas.</b> Aqui não instala, não funciona offline e não baixa o ZIP. Não use em
            campo.
          </div>
        )}
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

        {atrasadas > 0 && (
          <div className="aviso forte">
            ⚠ <b>{atrasadas}</b> vistoria(s) com alterações não exportadas há mais de 24 h. Abra e exporte o ZIP.
          </div>
        )}

        <input ref={inputZip} type="file" accept=".zip,application/zip" hidden onChange={aoEscolherZip} />
        {importando && <div className="aviso">{importando}</div>}
        {previaImport && (
          <div className="cartao">
            <h2>Importar backup</h2>
            <p>
              <b>{previaImport.titulo}</b> · {previaImport.nFotos} foto(s) · {previaImport.json.antenas?.length ?? 0}{' '}
              antena(s)
            </p>
            {previaImport.jaExiste && (
              <p className="texto-alerta">Esta vistoria já existe neste aparelho. Será criada uma cópia.</p>
            )}
            <div className="linha-botoes">
              <button type="button" className="btn primario" onClick={confirmarImport}>
                Importar
              </button>
              <button type="button" className="btn secundario" onClick={() => setPreviaImport(null)}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {lista === null && <p>Carregando…</p>}
        {lista?.length === 0 && <p className="vazio">Nenhuma vistoria ainda. Toque em “Nova vistoria”.</p>}

        {lista?.map((v) => {
          const cfg = getConfig(v.tipo);
          const semExport = !v.ultimaExportacao || v.ultimaExportacao < v.updatedAt;
          const atrasada = exportacaoAtrasada(v);
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
                  <span className={semExport ? 'texto-alerta' : ''}>
                    exportada {quando(v.ultimaExportacao)}
                    {atrasada && ' ⚠'}
                  </span>
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
        <button
          type="button"
          className="btn secundario grande botao-importar"
          disabled={!!importando}
          onClick={() => inputZip.current?.click()}
        >
          Importar ZIP
        </button>
        <button type="button" className="btn primario grande" onClick={nova}>
          + Nova vistoria
        </button>
      </footer>
    </div>
  );
}
