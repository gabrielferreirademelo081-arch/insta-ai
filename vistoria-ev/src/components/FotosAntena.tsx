import { useState } from 'react';
import type { Foto, Vistoria } from '../db/schema';
import { mensagemErro } from '../lib/erros';
import { salvarArquivos } from '../lib/fotos';
import { itemKey } from '../lib/slots';
import { toast } from '../lib/toast';
import { AlertaQualidade } from './AlertaQualidade';
import { CapturaBotoes } from './CapturaBotoes';
import { FotoGrid } from './FotoGrid';

interface Props {
  v: Vistoria;
  numero: string;
  /** Item do checklist que guarda as fotos de antena (43 no EV). */
  itemAntenas: number;
  fotos: Foto[];
  onAlterado: () => void;
}

/** Fotos de uma antena, tiradas direto do cadastro. Vão para o item de antenas já vinculadas ao nº. */
export function FotosAntena({ v, numero, itemAntenas, fotos, onAlterado }: Props) {
  const [ocupado, setOcupado] = useState('');
  const [comAlerta, setComAlerta] = useState<Foto | null>(null);
  const semNumero = !numero.trim();

  const aoFotografar = async (arqs: File[]) => {
    try {
      const salvas = await salvarArquivos(v, itemKey('C', itemAntenas), arqs, numero, (i, t) =>
        setOcupado(t > 1 ? `Salvando ${i}/${t}…` : 'Salvando…'),
      );
      const ruim = salvas.filter((f) => f.alerta);
      setComAlerta(ruim[ruim.length - 1] ?? null);
      if (!ruim.length) toast(salvas.length > 1 ? `${salvas.length} fotos da antena ${numero} salvas` : `Foto da antena ${numero} salva`);
    } catch (e) {
      toast(mensagemErro(e));
    } finally {
      setOcupado('');
      onAlterado();
    }
  };

  return (
    <div className="fotos-antena">
      <div className="campo-topo">
        <b>Fotos desta antena ({fotos.length})</b>
      </div>
      {semNumero ? (
        <p className="pequeno texto-alerta">Preencha o nº da antena para poder fotografar.</p>
      ) : (
        <>
          <FotoGrid fotos={fotos} vinculaAntena onAlterado={onAlterado} />
          {comAlerta && (
            <AlertaQualidade
              v={v}
              foto={comAlerta}
              onResolvido={(nova) => {
                setComAlerta(nova);
                onAlterado();
              }}
            />
          )}
          <CapturaBotoes onArquivos={aoFotografar} ocupado={!!ocupado} />
          {ocupado && <p className="pequeno">{ocupado}</p>}
          <p className="pequeno claro">As fotos entram no item {itemAntenas} do checklist, já com o nº desta antena.</p>
        </>
      )}
    </div>
  );
}
