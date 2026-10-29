import { useRef } from 'react';

interface Props {
  onArquivos: (arquivos: File[]) => void;
  ocupado?: boolean;
}

/**
 * Câmera (capture="environment") + galeria.
 * Se a câmera for negada/indisponível, o próprio navegador cai no seletor de arquivos;
 * o botão Galeria fica como alternativa.
 */
export function CapturaBotoes({ onArquivos, ocupado }: Props) {
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  const aoEscolher = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arqs = Array.from(e.target.files ?? []);
    e.target.value = ''; // permite escolher o mesmo arquivo de novo
    if (arqs.length) onArquivos(arqs);
  };
  return (
    <div className="captura">
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={aoEscolher} />
      <input ref={gal} type="file" accept="image/*" multiple hidden onChange={aoEscolher} />
      <button type="button" className="btn primario" disabled={ocupado} onClick={() => cam.current?.click()}>
        {ocupado ? 'Salvando…' : '📷 Fotografar'}
      </button>
      <button type="button" className="btn secundario" disabled={ocupado} onClick={() => gal.current?.click()}>
        🖼 Galeria
      </button>
    </div>
  );
}
