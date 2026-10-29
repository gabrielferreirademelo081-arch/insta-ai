/** Aviso rápido na tela, de qualquer lugar do código. */
export function toast(msg: string) {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: msg }));
}
