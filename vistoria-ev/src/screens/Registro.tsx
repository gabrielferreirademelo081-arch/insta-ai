import { Campo } from '../components/Campo';
import { getConfig } from '../config';
import type { PropsAba } from './Vistoria';

export function Registro({ v, setCampo }: PropsAba) {
  const cfg = getConfig(v.tipo);
  const faltando = cfg.registro
    .flatMap((g) => g.campos)
    .filter((c) => c.obrigatorio && !(v.campos[c.key] ?? '').trim());

  return (
    <>
      <p className="pequeno claro">Salva automaticamente.</p>
      {faltando.length > 0 && (
        <div className="aviso">Obrigatórios faltando: {faltando.map((c) => c.label).join(', ')}</div>
      )}
      {cfg.registro.map((g) => (
        <section key={g.titulo} className="cartao">
          <h2>{g.titulo}</h2>
          {g.campos.map((c) => (
            <Campo key={c.key} def={c} valor={v.campos[c.key] ?? ''} onChange={(x) => setCampo(c.key, x)} />
          ))}
        </section>
      ))}
    </>
  );
}
