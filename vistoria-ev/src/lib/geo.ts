export function minhaLocalizacao(): Promise<string> {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('GPS não disponível neste aparelho.'));
    navigator.geolocation.getCurrentPosition(
      (p) => res(`${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}`),
      (e) =>
        rej(
          new Error(
            e.code === e.PERMISSION_DENIED
              ? 'Permissão de localização negada. Libere nas configurações do navegador.'
              : 'Não foi possível obter a localização. Tente ao ar livre.',
          ),
        ),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

let ultimaPosicao: { valor: string; em: number } | null = null;
let gpsNegado = false;

/**
 * Posição para registrar na foto, sem travar o fluxo: usa a última leitura de até 2 min,
 * espera no máximo 4 s e desiste em silêncio (ex.: permissão negada, sem sinal).
 */
export function posicaoRapida(): Promise<string | undefined> {
  if (gpsNegado || !navigator.geolocation) return Promise.resolve(undefined);
  if (ultimaPosicao && Date.now() - ultimaPosicao.em < 120_000) return Promise.resolve(ultimaPosicao.valor);
  return new Promise((res) => {
    navigator.geolocation.getCurrentPosition(
      (p) => {
        ultimaPosicao = {
          valor: `${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}`,
          em: Date.now(),
        };
        res(ultimaPosicao.valor);
      },
      (e) => {
        if (e.code === e.PERMISSION_DENIED) gpsNegado = true;
        res(ultimaPosicao?.valor);
      },
      { enableHighAccuracy: true, timeout: 4000, maximumAge: 120_000 },
    );
  });
}
