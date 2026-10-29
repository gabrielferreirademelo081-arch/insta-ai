import { useRef, useState } from 'react';
import { atualizarFoto, excluirFoto } from '../db/repo';
import type { Foto, Vistoria } from '../db/schema';
import { mensagemErro } from '../lib/erros';
import { liberarThumb, salvarArquivos } from '../lib/fotos';
import { toast } from '../lib/toast';

interface Props {
  v: Vistoria;
  foto: Foto;
  /** Recebe a nova foto (que pode ter alerta de novo) ou null quando resolvido. */
  onResolvido: (nova: Foto | null) => void;
}

/** Pergunta se refaz uma foto que parece escura ou tremida. "Refazer" abre a câmera direto. */
export function AlertaQualidade({ v, foto, onResolvido }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState(false);
  const motivo = foto.alerta === 'escura' ? 'escura' : 'tremida ou desfocada';

  const aoEscolher = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arqs = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!arqs.length) return;
    setOcupado(true);
    try {
      const [nova] = await salvarArquivos(v, foto.itemId, arqs.slice(0, 1), foto.antena);
      await excluirFoto(foto.id);
      liberarThumb(foto.id);
      toast(nova.alerta ? 'Foto refeita, mas ainda parece ruim' : 'Foto refeita');
      onResolvido(nova.alerta ? nova : null);
    } catch (err) {
      toast(mensagemErro(err));
    } finally {
      setOcupado(false);
    }
  };

  const manter = async () => {
    try {
      await atualizarFoto({ ...foto, alerta: undefined });
    } catch (err) {
      toast(mensagemErro(err));
    }
    onResolvido(null);
  };

  return (
    <div className="aviso forte alerta-foto" role="alert">
      <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={aoEscolher} />
      <div>
        ⚠ A última foto parece <b>{motivo}</b>. Refazer agora evita voltar ao site.
      </div>
      <div className="linha-botoes">
        <button type="button" className="btn primario" disabled={ocupado} onClick={() => input.current?.click()}>
          {ocupado ? 'Salvando…' : '📷 Refazer'}
        </button>
        <button type="button" className="btn secundario" disabled={ocupado} onClick={manter}>
          Manter
        </button>
      </div>
    </div>
  );
}
