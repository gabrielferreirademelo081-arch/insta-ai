/** Redimensiona a foto no próprio aparelho antes de salvar. */

const LADO_MAIOR = 2000;
const QUALIDADE = 0.85;
const LADO_THUMB = 320;

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
    // A imagem já foi decodificada; o URL pode ser liberado depois do uso.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function desenhar(img: HTMLImageElement, max: number, qualidade: number): Promise<Blob> {
  // Navegadores atuais já aplicam a orientação EXIF em <img> e no canvas.
  const w0 = img.naturalWidth;
  const h0 = img.naturalHeight;
  const escala = Math.min(1, max / Math.max(w0, h0));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w0 * escala);
  canvas.height = Math.round(h0 * escala);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) =>
    canvas.toBlob(
      (b) => {
        canvas.width = canvas.height = 0; // libera memória (importante no iPhone)
        if (b) res(b);
        else rej(new Error('Falha ao comprimir a foto'));
      },
      'image/jpeg',
      qualidade,
    ),
  );
}

export async function processarFoto(arquivo: Blob): Promise<{ arquivo: Blob; thumb: Blob }> {
  const img = await carregar(arquivo);
  const grande = await desenhar(img, LADO_MAIOR, QUALIDADE);
  const thumb = await desenhar(img, LADO_THUMB, 0.7);
  return { arquivo: grande, thumb };
}
