/** Rotas por hash: funciona offline e em qualquer hospedagem estática. */
export type Aba = 'registro' | 'fotos' | 'patologias' | 'antenas' | 'pranchas' | 'exportar';

export type Rota =
  | { tela: 'lista' }
  | { tela: 'vistoria'; id: string; aba: Aba }
  | { tela: 'item'; id: string; ik: string };

const ABAS: Aba[] = ['registro', 'fotos', 'patologias', 'antenas', 'pranchas', 'exportar'];

/** Na prévia (build "artifact") a rota fica em memória: o frame do claude.ai não repassa #/caminho. */
const MEMORIA = import.meta.env.MODE === 'artifact';
let rotaMemoria = '';
export const EVENTO_ROTA = MEMORIA ? 'rota-memoria' : 'hashchange';
export const hashAtual = () => (MEMORIA ? rotaMemoria : location.hash);

export function lerRota(hash = hashAtual()): Rota {
  const p = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (p[0] !== 'v' || !p[1]) return { tela: 'lista' };
  if (p[2] === 'item' && p[3]) return { tela: 'item', id: p[1], ik: p[3] };
  const aba = ABAS.includes(p[2] as Aba) ? (p[2] as Aba) : 'registro';
  return { tela: 'vistoria', id: p[1], aba };
}

export function ir(caminho: string) {
  if (!MEMORIA) {
    location.hash = caminho;
    return;
  }
  rotaMemoria = `#${caminho}`;
  window.dispatchEvent(new Event(EVENTO_ROTA));
}
