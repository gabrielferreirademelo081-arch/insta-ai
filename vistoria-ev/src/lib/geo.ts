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
