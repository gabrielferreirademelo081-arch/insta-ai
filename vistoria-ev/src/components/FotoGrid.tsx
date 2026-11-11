import { useEffect, useState } from 'react';
import { atualizarFoto, excluirFoto, obterDadosFoto } from '../db/repo';
import type { Foto } from '../db/schema';
import { mensagemErro } from '../lib/erros';
import { formatarDataHora, liberarThumb, urlThumb } from '../lib/fotos';
import { rotuloAntena } from '../lib/naming';
import { toast } from '../lib/toast';

interface Props {
  fotos: Foto[];
  vinculaAntena?: boolean;
  onAlterado: () => void;
}

export function FotoGrid({ fotos, vinculaAntena, onAlterado }: Props) {
  const [aberta, setAberta] = useState<Foto | null>(null);
  if (!fotos.length) return null;
  return (
    <>
      <div className="grid-fotos">
        {fotos.map((f, i) => (
          <button type="button" key={f.id} className="thumb" onClick={() => setAberta(f)}>
            <img src={urlThumb(f)} alt={`Foto ${i + 1}`} loading="lazy" />
            <span className="thumb-n">{i + 1}</span>
            {f.antena && <span className="thumb-ant">ANT {rotuloAntena(f.antena)}</span>}
            {f.alerta && (
              <span className="thumb-alerta" title={f.alerta}>
                ⚠
              </span>
            )}
          </button>
        ))}
      </div>
      {aberta && (
        <Visualizador
          foto={aberta}
          vinculaAntena={vinculaAntena}
          onFechar={() => setAberta(null)}
          onAlterado={() => {
            setAberta(null);
            onAlterado();
          }}
        />
      )}
    </>
  );
}

function Visualizador({
  foto,
  vinculaAntena,
  onFechar,
  onAlterado,
}: {
  foto: Foto;
  vinculaAntena?: boolean;
  onFechar: () => void;
  onAlterado: () => void;
}) {
  const [url, setUrl] = useState<string>('');
  const [antena, setAntena] = useState(foto.antena ?? '');

  useEffect(() => {
    let u = '';
    let aberto = true;
    obterDadosFoto(foto.id).then((d) => {
      if (!d || !aberto) return; // fechou antes de carregar: não cria URL (evita vazar memória)
      u = URL.createObjectURL(new Blob([d], { type: 'image/jpeg' }));
      setUrl(u);
    });
    return () => {
      aberto = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [foto.id]);

  const salvarAntena = async () => {
    if ((foto.antena ?? '') === antena.trim()) return onFechar();
    try {
      await atualizarFoto({ ...foto, antena: antena.trim() || undefined });
      onAlterado();
    } catch (e) {
      toast(mensagemErro(e));
    }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-img">{url ? <img src={url} alt="" /> : <p>Carregando…</p>}</div>
      <div className="modal-barra">
        <p className="mono pequeno">{foto.nome}</p>
        <p className="pequeno">
          {foto.capturadaEm ? formatarDataHora(foto.capturadaEm) : ''}
          {foto.gps ? ` · ${foto.gps}` : ' · sem GPS'}
          {foto.alerta ? ` · ⚠ parece ${foto.alerta}` : ''}
        </p>
        {vinculaAntena && (
          <div className="campo">
            <label htmlFor="ant-foto">Nº da antena nesta foto</label>
            <input id="ant-foto" inputMode="numeric" value={antena} onChange={(e) => setAntena(e.target.value)} />
          </div>
        )}
        <div className="linha-botoes">
          <button
            type="button"
            className="btn perigo"
            onClick={async () => {
              if (!confirm('Excluir esta foto?')) return;
              try {
                await excluirFoto(foto.id);
                liberarThumb(foto.id);
                onAlterado();
              } catch (e) {
                toast(mensagemErro(e));
              }
            }}
          >
            Excluir
          </button>
          <button type="button" className="btn primario" onClick={vinculaAntena ? salvarAntena : onFechar}>
            {vinculaAntena ? 'Salvar e fechar' : 'Fechar'}
          </button>
        </div>
      </div>
    </div>
  );
}
