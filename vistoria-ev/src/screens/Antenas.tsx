import { useCallback, useEffect, useRef, useState } from 'react';
import { Campo } from '../components/Campo';
import { FotosAntena } from '../components/FotosAntena';
import { getConfig } from '../config';
import { atualizarFoto, excluirAntena, listarAntenas, listarFotos, novoId, salvarAntena } from '../db/repo';
import type { Antena, Foto } from '../db/schema';
import { useAutosave } from '../hooks/useAutosave';
import { mensagemErro } from '../lib/erros';
import { mesmaAntena, rotuloAntena } from '../lib/naming';
import { toast } from '../lib/toast';
import { avisosAntena } from '../lib/validacao';
import type { PropsAba } from './Vistoria';

function proximoNumero(lista: Antena[]): string {
  const nums = lista.map((a) => parseInt(a.campos.numero, 10)).filter((n) => !isNaN(n));
  return String((nums.length ? Math.max(...nums) : 0) + 1);
}

export function Antenas({ v, setCampo }: PropsAba) {
  const cfg = getConfig(v.tipo);
  const [lista, setLista] = useState<Antena[] | null>(null);
  const [fotos43, setFotos43] = useState<Foto[]>([]);
  const [aberta, setAberta] = useState<string | null>(null);
  const itemAntenas = cfg.checklist.find((i) => i.vinculaAntena)?.num;
  const listaRef = useRef<Antena[]>([]);
  listaRef.current = lista ?? [];
  /** Último nº (não vazio) gravado de cada antena: base para levar as fotos junto quando ela é renumerada. */
  const numeroGravado = useRef(new Map<string, string>());

  const recarregarFotos = useCallback(
    () =>
      listarFotos(v.id)
        .then((f) => setFotos43(f.filter((x) => x.antena)))
        .catch((e) => toast(mensagemErro(e))),
    [v.id],
  );

  /**
   * Salva a antena e, se o nº mudou, leva as fotos do nº antigo para o novo.
   * Roda no salvamento automático (não no "sair do campo"), então funciona mesmo trocando de aba direto.
   */
  const salvarComFotos = useCallback(
    async (a: Antena) => {
      await salvarAntena(a);
      const novo = (a.campos.numero ?? '').trim();
      const antes = numeroGravado.current.get(a.id) ?? '';
      if (!novo) return; // apagou o nº para digitar outro: espera o definitivo
      if (!antes || mesmaAntena(antes, novo)) {
        numeroGravado.current.set(a.id, novo);
        return;
      }
      const outras = listaRef.current.filter((x) => x.id !== a.id);
      if (outras.some((x) => mesmaAntena(x.campos.numero, antes))) {
        // O nº antigo ainda é de outra antena: as fotos são dela.
        numeroGravado.current.set(a.id, novo);
        return;
      }
      if (outras.some((x) => mesmaAntena(x.campos.numero, novo))) {
        toast(`O nº ${novo} já é de outra antena. As fotos continuam com o nº ${antes} até você corrigir.`);
        return;
      }
      const afetadas = (await listarFotos(a.vistoriaId)).filter((f) => mesmaAntena(f.antena, antes));
      for (const f of afetadas) await atualizarFoto({ ...f, antena: novo });
      numeroGravado.current.set(a.id, novo);
      if (afetadas.length) {
        toast(`${afetadas.length} foto(s) passaram da antena ${antes} para a ${novo}`);
        recarregarFotos();
      }
    },
    [recarregarFotos],
  );
  const { agendar, flush } = useAutosave<Antena>(salvarComFotos);

  useEffect(() => {
    listarAntenas(v.id)
      .then((l) => {
        for (const a of l) if (a.campos.numero?.trim()) numeroGravado.current.set(a.id, a.campos.numero.trim());
        setLista(l);
      })
      .catch((e) => toast(mensagemErro(e)));
    recarregarFotos();
  }, [v.id, recarregarFotos]);

  if (!lista) return <p>Carregando…</p>;

  const reordenar = (l: Antena[]) => l.map((a, i) => (a.ordem === i ? a : { ...a, ordem: i }));

  const gravarLista = async (nova: Antena[], abrir?: string) => {
    flush();
    const ord = reordenar(nova);
    for (const a of ord) {
      const n = a.campos.numero?.trim();
      if (n && !numeroGravado.current.has(a.id)) numeroGravado.current.set(a.id, n);
    }
    setLista(ord);
    if (abrir) setAberta(abrir);
    try {
      for (const a of ord) await salvarAntena(a);
    } catch (e) {
      toast(mensagemErro(e));
    }
  };

  const mudar = (id: string, key: string, valor: string) => {
    setLista((l) =>
      l!.map((a) => {
        if (a.id !== id) return a;
        const n = { ...a, campos: { ...a.campos, [key]: valor } };
        agendar(n.id, n);
        return n;
      }),
    );
  };

  const adicionar = () => {
    const a: Antena = {
      id: novoId(),
      vistoriaId: v.id,
      ordem: lista.length,
      campos: { numero: proximoNumero(lista), status: 'Ativa' },
    };
    gravarLista([...lista, a], a.id);
  };

  const duplicar = (i: number) => {
    const orig = lista[i];
    const c: Antena = {
      id: novoId(),
      vistoriaId: v.id,
      ordem: i + 1,
      campos: { ...orig.campos, numero: proximoNumero(lista) },
    };
    gravarLista([...lista.slice(0, i + 1), c, ...lista.slice(i + 1)], c.id);
  };

  const excluir = async (i: number) => {
    const a = lista[i];
    if (!confirm(`Excluir a antena ${a.campos.numero || i + 1}?`)) return;
    flush();
    try {
      await excluirAntena(a.id);
      gravarLista(lista.filter((x) => x.id !== a.id));
    } catch (e) {
      toast(mensagemErro(e));
    }
  };

  const numerosRepetidos = new Set<string>();
  const vistos = new Set<string>();
  for (const a of lista) {
    const r = rotuloAntena(a.campos.numero ?? '');
    if (r && vistos.has(r)) numerosRepetidos.add(r);
    vistos.add(r);
  }

  return (
    <>
      <p className="pequeno claro">
        Uma linha por antena. O nº deve ser o mesmo usado nas fotos do item 43. Operadora é obrigatória.
      </p>

      {lista.map((a, i) => {
        const aberto = aberta === a.id;
        const avisos = avisosAntena(cfg, a.campos, v.campos);
        const nAvisos = Object.keys(avisos).length;
        const nFotos = fotos43.filter((f) => mesmaAntena(f.antena, a.campos.numero)).length;
        const semOperadora = !(a.campos.operadora ?? '').trim();
        const repetido = numerosRepetidos.has(rotuloAntena(a.campos.numero ?? ''));
        const resumo = [a.campos.operadora, a.campos.tipo, a.campos.alturaCentro && `${a.campos.alturaCentro} m`, a.campos.azimute && `Az ${a.campos.azimute}°`]
          .filter(Boolean)
          .join(' · ');
        return (
          <section key={a.id} className={`cartao antena${semOperadora ? ' faltando' : ''}`}>
            <button type="button" className="antena-cab" onClick={() => setAberta(aberto ? null : a.id)}>
              <span className="item-num">{a.campos.numero || '?'}</span>
              <span className="antena-resumo">
                {resumo || 'Sem dados'}
                <span className="pequeno">
                  {a.campos.status || ''} · {nFotos} foto(s) no item 43
                  {semOperadora && <b className="texto-alerta"> · falta operadora</b>}
                  {repetido && <b className="texto-alerta"> · nº repetido</b>}
                  {nAvisos > 0 && <b className="texto-alerta"> · {nAvisos} valor(es) a conferir</b>}
                </span>
              </span>
              <span>{aberto ? '▲' : '▼'}</span>
            </button>
            {aberto && (
              <div className="antena-corpo">
                {cfg.antena.map((c) => (
                  <Campo
                    key={c.key}
                    idPrefixo={`a${i}`}
                    def={c}
                    valor={a.campos[c.key] ?? ''}
                    aviso={avisos[c.key] ?? null}
                    onChange={(x) => mudar(a.id, c.key, x)}
                    onAnterior={i > 0 && c.key !== 'numero' ? () => mudar(a.id, c.key, lista[i - 1].campos[c.key] ?? '') : undefined}
                  />
                ))}
                {itemAntenas !== undefined && (
                  <FotosAntena
                    v={v}
                    numero={a.campos.numero ?? ''}
                    itemAntenas={itemAntenas}
                    fotos={fotos43.filter((f) => mesmaAntena(f.antena, a.campos.numero))}
                    onAlterado={recarregarFotos}
                  />
                )}
                <div className="linha-botoes">
                  <button type="button" className="btn secundario" onClick={() => duplicar(i)}>
                    Duplicar linha
                  </button>
                  <button type="button" className="btn perigo" onClick={() => excluir(i)}>
                    Excluir
                  </button>
                </div>
              </div>
            )}
          </section>
        );
      })}

      <button type="button" className="btn primario bloco grande" onClick={adicionar}>
        + Adicionar antena
      </button>

      <section className="cartao">
        <h2>Esteira e cabos</h2>
        {cfg.antenaExtras.map((c) => (
          <Campo key={c.key} def={c} valor={v.campos[c.key] ?? ''} onChange={(x) => setCampo(c.key, x)} />
        ))}
      </section>
    </>
  );
}
