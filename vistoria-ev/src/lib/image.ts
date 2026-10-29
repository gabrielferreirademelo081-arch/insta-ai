/** Redimensiona, carimba e confere a qualidade da foto no próprio aparelho, antes de salvar. */

const LADO_MAIOR = 2000;
const QUALIDADE = 0.85;
const LADO_THUMB = 320;
const LADO_ANALISE = 640;

export type AlertaFoto = 'escura' | 'tremida';

async function carregar(arquivo: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new Error('Não foi possível ler a imagem (formato não suportado?).');
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** Navegadores atuais já aplicam a orientação EXIF em <img> e no canvas. */
function canvasReduzido(img: HTMLImageElement, max: number): HTMLCanvasElement {
  const escala = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * escala);
  c.height = Math.round(img.naturalHeight * escala);
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível');
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

function codificar(c: HTMLCanvasElement, qualidade: number): Promise<Blob> {
  return new Promise((res, rej) =>
    c.toBlob(
      (b) => {
        c.width = c.height = 0; // libera memória (importante no iPhone)
        if (b) res(b);
        else rej(new Error('Falha ao comprimir a foto'));
      },
      'image/jpeg',
      qualidade,
    ),
  );
}

/** Faixa escura no rodapé com as linhas de texto. */
function carimbar(c: HTMLCanvasElement, linhas: string[]) {
  const ctx = c.getContext('2d')!;
  const fonte = Math.max(16, Math.round(Math.min(c.width, c.height) * 0.028));
  const alturaLinha = Math.round(fonte * 1.3);
  const pad = Math.round(fonte * 0.5);
  const h = linhas.length * alturaLinha + pad * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, c.height - h, c.width, h);
  ctx.fillStyle = '#fff';
  ctx.font = `600 ${fonte}px system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = 'top';
  linhas.forEach((l, i) => ctx.fillText(l, pad, c.height - h + pad + i * alturaLinha, c.width - pad * 2));
}

/**
 * Brilho médio (0–255) e nitidez (variância do Laplaciano em tons de cinza).
 * A foto é dividida em 4x4 regiões e vale a 2ª região mais nítida: assim céu ou parede lisa
 * não fazem uma foto boa parecer tremida, mas uma foto toda borrada continua com nota baixa.
 */
export function medirQualidade(c: HTMLCanvasElement): { brilho: number; nitidez: number } {
  const { width: w, height: h } = c;
  const px = c.getContext('2d')!.getImageData(0, 0, w, h).data;
  const cinza = new Float32Array(w * h);
  let soma = 0;
  for (let i = 0; i < w * h; i++) {
    const g = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
    cinza[i] = g;
    soma += g;
  }
  const N = 4;
  const s = new Float64Array(N * N);
  const s2 = new Float64Array(N * N);
  const n = new Float64Array(N * N);
  for (let y = 1; y < h - 1; y++) {
    const ty = Math.min(N - 1, Math.floor((y * N) / h));
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = 4 * cinza[i] - cinza[i - 1] - cinza[i + 1] - cinza[i - w] - cinza[i + w];
      const t = ty * N + Math.min(N - 1, Math.floor((x * N) / w));
      s[t] += lap;
      s2[t] += lap * lap;
      n[t]++;
    }
  }
  const variancias = Array.from(n, (k, t) => (k ? s2[t] / k - (s[t] / k) ** 2 : 0)).sort((a, b) => b - a);
  return { brilho: soma / (w * h), nitidez: variancias[1] ?? 0 };
}

export interface OpcoesFoto {
  carimbo?: string[];
  limites: { brilhoMinimo: number; nitidezMinima: number };
}

export async function processarFoto(
  arquivo: Blob,
  op: OpcoesFoto,
): Promise<{ arquivo: Blob; thumb: Blob; alerta?: AlertaFoto }> {
  const img = await carregar(arquivo);

  // Qualidade medida na foto original (sem carimbo), em tamanho reduzido.
  const ca = canvasReduzido(img, LADO_ANALISE);
  const q = medirQualidade(ca);
  ca.width = ca.height = 0;
  const alerta: AlertaFoto | undefined =
    q.brilho < op.limites.brilhoMinimo ? 'escura' : q.nitidez < op.limites.nitidezMinima ? 'tremida' : undefined;

  const cg = canvasReduzido(img, LADO_MAIOR);
  if (op.carimbo?.length) carimbar(cg, op.carimbo);
  const grande = await codificar(cg, QUALIDADE);
  const thumb = await codificar(canvasReduzido(img, LADO_THUMB), 0.7);
  return { arquivo: grande, thumb, alerta };
}
