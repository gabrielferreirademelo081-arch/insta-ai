import { useCallback, useEffect, useRef, useState } from 'react';
import { getConfig } from '../config';
import { obterVistoria, salvarCampos } from '../db/repo';
import type { Vistoria } from '../db/schema';
import { useAutosave } from '../hooks/useAutosave';
import { mensagemErro } from '../lib/erros';
import { ir, type Aba, type Rota } from '../lib/rota';
import { toast } from '../lib/toast';
import { Antenas } from './Antenas';
import { Checklist } from './Checklist';
import { Exportar } from './Exportar';
import { Patologias } from './Patologias';
import { Pranchas } from './Pranchas';
import { Registro } from './Registro';
import { SlotDetalhe } from './SlotDetalhe';

const ABAS: { id: Aba; icone: string; nome: string }[] = [
  { id: 'registro', icone: '📝', nome: 'Registro' },
  { id: 'fotos', icone: '📷', nome: 'Fotos' },
  { id: 'patologias', icone: '⚠️', nome: 'Patolog.' },
  { id: 'antenas', icone: '📡', nome: 'Antenas' },
  { id: 'pranchas', icone: '📐', nome: 'Pranchas' },
  { id: 'exportar', icone: '📦', nome: 'Exportar' },
];

export interface PropsAba {
  v: Vistoria;
  setCampo: (key: string, valor: string) => void;
}

export function VistoriaTela({ rota }: { rota: Exclude<Rota, { tela: 'lista' }> }) {
  const [v, setV] = useState<Vistoria | null | undefined>(undefined);
  const vRef = useRef<Vistoria | null>(null);
  const { agendar, flush } = useAutosave<Vistoria>((x) => salvarCampos(x.id, x.campos));

  useEffect(() => {
    obterVistoria(rota.id)
      .then((x) => {
        vRef.current = x ?? null;
        setV(x ?? null);
      })
      .catch((e) => toast(mensagemErro(e)));
  }, [rota.id]);

  const setCampo = useCallback(
    (key: string, valor: string) => {
      const atual = vRef.current;
      if (!atual) return;
      const novo = { ...atual, campos: { ...atual.campos, [key]: valor } };
      vRef.current = novo;
      setV(novo);
      agendar(novo.id, novo);
    },
    [agendar],
  );

  // Salva pendências ao trocar de aba/tela.
  useEffect(() => flush(), [rota, flush]);

  if (v === undefined) return <div className="tela"><p className="conteudo">Carregando…</p></div>;
  if (v === null)
    return (
      <div className="tela">
        <main className="conteudo">
          <p>Vistoria não encontrada.</p>
          <button className="btn primario" onClick={() => ir('/')}>Voltar</button>
        </main>
      </div>
    );

  const cfg = getConfig(v.tipo);
  const abaAtual: Aba = rota.tela === 'item' ? (rota.ik.startsWith('PR') ? 'pranchas' : 'fotos') : rota.aba;
  const props: PropsAba = { v, setCampo };

  return (
    <div className="tela com-abas">
      <header className="topo">
        <button
          type="button"
          className="voltar"
          aria-label="Voltar"
          onClick={() => ir(rota.tela === 'item' ? `/v/${v.id}/fotos` : '/')}
        >
          ←
        </button>
        <div className="topo-titulo">
          <h1>
            {v.campos[cfg.campoObra] || 'Sem obra'} · {v.campos[cfg.campoIdSite] || 'sem ID'}
          </h1>
          <p className="pequeno claro">{ABAS.find((a) => a.id === abaAtual)?.nome}</p>
        </div>
      </header>

      <main className="conteudo">
        {rota.tela === 'item' ? (
          <SlotDetalhe {...props} ik={rota.ik} />
        ) : rota.aba === 'registro' ? (
          <Registro {...props} />
        ) : rota.aba === 'fotos' ? (
          <Checklist {...props} />
        ) : rota.aba === 'patologias' ? (
          <Patologias {...props} />
        ) : rota.aba === 'antenas' ? (
          <Antenas {...props} />
        ) : rota.aba === 'pranchas' ? (
          <Pranchas {...props} />
        ) : (
          <Exportar {...props} />
        )}
      </main>

      <nav className="abas">
        {ABAS.map((a) => (
          <button
            type="button"
            key={a.id}
            className={a.id === abaAtual ? 'ativa' : ''}
            onClick={() => ir(`/v/${v.id}/${a.id}`)}
          >
            <span className="aba-icone">{a.icone}</span>
            <span>{a.nome}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
