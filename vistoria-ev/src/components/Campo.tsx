import { useState } from 'react';
import type { CampoDef } from '../config/types';
import { minhaLocalizacao } from '../lib/geo';
import { toast } from '../lib/toast';
import { validarCampo } from '../lib/validacao';

interface Props {
  def: CampoDef;
  valor: string;
  onChange: (v: string) => void;
  /** Mostra o botão "mesmo da anterior". */
  onAnterior?: () => void;
  idPrefixo?: string;
  /** Aviso externo (ex.: regra entre campos). Sem ele, valida formato/faixa do próprio campo. */
  aviso?: string | null;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function Campo({ def, valor, onChange, onAnterior, idPrefixo = 'f', aviso, onFocus, onBlur }: Props) {
  const id = `${idPrefixo}-${def.key}`;
  const [buscandoGps, setBuscandoGps] = useState(false);
  const faltando = def.obrigatorio && !valor.trim();
  const msg = aviso ?? validarCampo(def, valor);

  let controle: JSX.Element;
  switch (def.tipo) {
    case 'opcoes':
      controle = (
        <div className="segmentado" role="group" aria-labelledby={`${id}-l`}>
          {def.opcoes!.map((o) => (
            <button
              type="button"
              key={o}
              aria-pressed={valor === o}
              className={valor === o ? 'ativo' : ''}
              onClick={() => onChange(valor === o ? '' : o)}
            >
              {o}
            </button>
          ))}
        </div>
      );
      break;
    case 'textoLongo':
      controle = <textarea id={id} rows={5} value={valor} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'data':
      controle = <input id={id} type="date" value={valor} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'geo':
      controle = (
        <>
          <input
            id={id}
            type="text"
            inputMode="decimal"
            placeholder="-23.550520, -46.633308"
            value={valor}
            onChange={(e) => onChange(e.target.value)}
          />
          <button
            type="button"
            className="btn secundario bloco"
            disabled={buscandoGps}
            onClick={async () => {
              setBuscandoGps(true);
              try {
                onChange(await minhaLocalizacao());
              } catch (e) {
                toast((e as Error).message);
              } finally {
                setBuscandoGps(false);
              }
            }}
          >
            {buscandoGps ? 'Obtendo localização…' : '📍 Usar minha localização'}
          </button>
        </>
      );
      break;
    default:
      controle = (
        <>
          <input
            id={id}
            type="text"
            inputMode={def.tipo === 'numero' ? 'decimal' : undefined}
            placeholder={def.placeholder}
            list={def.sugestoes ? `${id}-dl` : undefined}
            value={valor}
            autoComplete="off"
            onFocus={onFocus}
            onBlur={onBlur}
            onChange={(e) => onChange(e.target.value)}
          />
          {def.sugestoes && (
            <datalist id={`${id}-dl`}>
              {def.sugestoes.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          )}
        </>
      );
  }

  return (
    <div className={`campo${faltando ? ' faltando' : ''}${msg ? ' invalido' : ''}`}>
      <div className="campo-topo">
        <label id={`${id}-l`} htmlFor={id}>
          {def.label}
          {def.obrigatorio && <span className="obrig"> *</span>}
        </label>
        {onAnterior && (
          <button type="button" className="mini" onClick={onAnterior} title="Copiar da antena anterior">
            ↑ anterior
          </button>
        )}
      </div>
      {controle}
      {msg && <p className="campo-aviso">⚠ {msg}</p>}
    </div>
  );
}
